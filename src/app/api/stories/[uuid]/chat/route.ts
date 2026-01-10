import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";
import { CHAT_CONFIG } from "@/config/chat.config";
import {
  buildInitialChatSystemPrompt,
  IDEALIZATION_END_MESSAGE_MODEL,
  IDEALIZATION_END_MESSAGE_USER,
} from "@/features/story/prompts/chat";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { env } from "@/lib/env";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { chatRequestSchema } from "@/lib/schemas/chatRequest";
import {
  CommandDetector,
  HistoryOptimizer,
  SelectiveHistoryLoader,
  SuggestionGenerator,
} from "@/services/chat";
import { handlePauseModeCommands } from "@/services/chat/PauseModeHandler";
import { GeminiClient } from "@/services/gemini/GeminiClient";
import type { GeminiMessage } from "@/types/chat";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { uuid } = await params;

    // Validar body com schema atualizado
    const body = await request.json();
    const { prompt, important, isMeta, generateSuggestions } =
      chatRequestSchema.parse(body);

    // Buscar história
    const story = await prismaClient.story.findUnique({
      where: { uuid: uuid },
      include: {
        conversationHistory: true,
      },
    });

    if (!story) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    if (story.userId !== user.id) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    // Tratamento para inconsistências onde o Prisma pode retornar array ou objeto
    const historyData = story.conversationHistory;
    const chatSessionReference = Array.isArray(historyData)
      ? historyData[0]
      : historyData;

    if (!chatSessionReference) {
      throw new HttpExceptionClient(
        404,
        "Histórico de conversas não encontrado",
      );
    }

    // Buscar mensagens explicitamente (excluindo consultas com isMeta: true)
    const conversationHistoryWithMessages =
      await prismaClient.conversationHistory.findUnique({
        where: { id: chatSessionReference.id },
        select: {
          id: true,
          customPrompt: true,
          pauseNarrativeMode: true, // CARREGAR ESTADO DO MODO PAUSA
          messages: {
            where: { isMeta: false },
            orderBy: { id: "asc" },
          },
        },
      });

    if (!conversationHistoryWithMessages) {
      throw new HttpExceptionClient(
        404,
        "Histórico de conversas não encontrado ao buscar mensagens",
      );
    }

    // ========================================================================
    // DETECÇÃO DE COMANDOS E INFERÊNCIA DE TIPOS
    // ========================================================================
    // ========================================================================
    const commandDetector = new CommandDetector();
    const rawCommand = commandDetector.detectNarrativeCommand(prompt);
    const isInPauseMode = conversationHistoryWithMessages.pauseNarrativeMode;

    // ========================================================================
    // SEPARAR: Comando para HISTÓRICO vs Comando para TIPOS DE MENSAGEM
    // ========================================================================
    // O comando para carregamento de histórico pode ser sobrescrito pelo modo pausa,
    // MAS o comando para classificação de mensagens deve SEMPRE ser o real
    let historyLoadingCommand = rawCommand;
    const messageClassificationCommand = rawCommand;

    if (isInPauseMode && rawCommand !== "RETOMAR_NARRATIVA") {
      // Durante modo pausa, SEMPRE usar config de pausa para HISTÓRICO
      historyLoadingCommand = "PAUSAR_NARRATIVA";
      logger.info(
        { rawCommand, isInPauseMode },
        "Em modo PAUSAR NARRATIVA - forçando configuração de pausa para histórico",
      );
    } else if (!isInPauseMode && rawCommand === "GENERAL") {
      // Fora do modo pausa, mensagens sem comando também usam pausa para HISTÓRICO
      historyLoadingCommand = "PAUSAR_NARRATIVA";
      logger.info(
        "Mensagem sem comando - usando configuração de pausa para histórico",
      );
    }

    // Converter para tipo seguro (nunca GENERAL) - apenas para histórico
    const detectedCommand: Exclude<typeof historyLoadingCommand, "GENERAL"> =
      historyLoadingCommand === "GENERAL"
        ? "PAUSAR_NARRATIVA"
        : historyLoadingCommand;

    // ✅ USAR COMANDO REAL para inferir tipos de mensagem
    const userMessageType = commandDetector.inferUserMessageType(
      messageClassificationCommand,
    );
    const responseMessageType = commandDetector.inferResponseMessageType(
      messageClassificationCommand,
    );

    logger.info(
      {
        rawCommand,
        historyLoadingCommand: detectedCommand,
        messageClassificationCommand,
        userMessageType,
        responseMessageType,
      },
      "Comando narrativo detectado",
    );

    // ========================================================================
    // INTERCEPTAÇÃO: ATIVAR/DESATIVAR MODO PAUSA
    // ========================================================================
    const pauseModeResponse = await handlePauseModeCommands(
      rawCommand,
      isInPauseMode,
      conversationHistoryWithMessages.id,
      prismaClient,
    );

    if (pauseModeResponse) {
      return pauseModeResponse;
    }

    // ========================================================================
    // INTERCEPTAÇÃO DE COMANDO: FINALIZAR IDEALIZAÇÃO
    // ========================================================================

    if (commandDetector.isFinalizeIdealizationCommand(prompt)) {
      // Salvar mensagem do usuário
      await prismaClient.message.create({
        data: {
          content: IDEALIZATION_END_MESSAGE_USER,
          role: "USER",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: false,
          isMeta: true,
          messageType: "SYSTEM",
        },
      });

      // Salvar resposta do modelo
      await prismaClient.message.create({
        data: {
          content: IDEALIZATION_END_MESSAGE_MODEL,
          role: "MODEL",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: false,
          isMeta: true,
          messageType: "SYSTEM",
        },
      });

      return NextResponse.json(
        {
          message: IDEALIZATION_END_MESSAGE_MODEL,
          suggestedPrompts: [],
        },
        { status: 200 },
      );
    }

    // ========================================================================
    // INICIALIZAR SERVIÇOS
    // ========================================================================
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    // DEBUG: Verificar se safety settings estão corretas
    logger.info(
      {
        model: CHAT_CONFIG.ai.model,
        safetySettings: CHAT_CONFIG.ai.safetySettings,
      },
      "Criando modelo Gemini com safety settings",
    );

    const model = genAI.getGenerativeModel({
      model: CHAT_CONFIG.ai.model,
      safetySettings: CHAT_CONFIG.ai.safetySettings,
    });

    const historyOptimizer = new HistoryOptimizer(genAI, prismaClient);
    const suggestionGenerator = new SuggestionGenerator(genAI);
    const geminiClient = new GeminiClient(genAI);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectiveLoader = new SelectiveHistoryLoader(prismaClient as any);

    // ========================================================================
    // CONSTRUIR HISTÓRICO (SELETIVO OU OTIMIZADO)
    // ========================================================================
    let history: GeminiMessage[];

    // Usar carregamento seletivo sempre (GENERAL foi convertido para PAUSAR_NARRATIVA)
    logger.info(
      { detectedCommand },
      "Usando carregamento seletivo de histórico",
    );
    const { messages, stats } = await selectiveLoader.loadSelectiveHistory(
      detectedCommand,
      conversationHistoryWithMessages.id,
    );

    // Converter mensagens para formato Gemini
    history = await historyOptimizer.buildOptimizedHistory(messages);

    logger.info({ stats }, "Histórico seletivo carregado e otimizado");

    // Injetar prompt inicial do sistema
    const initialSystemPrompt = buildInitialChatSystemPrompt(
      conversationHistoryWithMessages.customPrompt,
    );

    const fullHistory = [...initialSystemPrompt, ...history];

    const chat = model.startChat({
      history: fullHistory,
      generationConfig: {
        temperature: CHAT_CONFIG.ai.temperature,
      },
    });

    // ========================================================================
    // ENVIAR MENSAGEM E PROCESSAR STREAM
    // ========================================================================
    const { text: responseText, interrupted: wasInterrupted } =
      await geminiClient.sendMessageStream(chat, prompt, request.signal);

    // ========================================================================
    // DETECÇÃO AUTOMÁTICA DE COMANDOS IMPORTANTES
    // ========================================================================
    const isImportantMessage = commandDetector.shouldMarkAsImportant(
      prompt,
      important,
    );

    if (commandDetector.hasApproveCommand(prompt)) {
      logger.info(
        "Comando [APROVAR E SELAR ESBOÇO] detectado - marcando como importante",
      );
    }

    if (commandDetector.hasReviewCommand(prompt)) {
      logger.info(
        "Comando [REVISAR E CORRIGIR SEÇÃO] detectado - marcando como importante",
      );
    }

    // Determinar se comando do usuário deve ser meta (não aparecer no histórico)
    const isUserCommandMeta = commandDetector.shouldMarkAsMeta(
      messageClassificationCommand,
    );

    if (isUserCommandMeta) {
      logger.info(
        { command: messageClassificationCommand },
        "Comando narrativo detectado - marcando mensagem do usuário como meta",
      );
    }

    // ========================================================================
    // SALVAR MENSAGENS
    // ========================================================================
    // Salvar mensagem do usuário
    await prismaClient.message.create({
      data: {
        content: prompt,
        role: "USER",
        conversationHistoryId: conversationHistoryWithMessages.id,
        important: isImportantMessage,
        isMeta: isUserCommandMeta, // ✅ Automático baseado no comando
        generateSuggestions: generateSuggestions,
        messageType: userMessageType,
      },
    });

    // Se houve interrupção, salvar mensagem de interrupção
    if (wasInterrupted) {
      const interruptedMessage = await prismaClient.message.create({
        data: {
          content: CHAT_CONFIG.commands.interruptionMarker,
          role: "MODEL",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: false,
          isMeta: false,
          messageType: "SYSTEM",
        },
      });

      logger.warn(
        {
          messageId: interruptedMessage.id,
          conversationHistoryId: conversationHistoryWithMessages.id,
        },
        "Cliente abortou a requisição. Mensagem de interrupção foi salva.",
      );

      return new NextResponse(null, { status: 499 }); // 499 Client Closed Request
    }

    // Salvar resposta do modelo
    const savedModelMessage = await prismaClient.message.create({
      data: {
        content: responseText,
        role: "MODEL",
        conversationHistoryId: conversationHistoryWithMessages.id,
        important: isImportantMessage,
        isMeta: isMeta,
        messageType: responseMessageType,
      },
    });

    // ========================================================================
    // GERAR SUGESTÕES (SE SOLICITADO)
    // ========================================================================
    let suggestedPrompts: string[] = [];

    if (generateSuggestions) {
      suggestedPrompts = await suggestionGenerator.generateSuggestedPrompts(
        history,
        responseText,
      );
    }

    return NextResponse.json(
      {
        message: responseText,
        messageId: savedModelMessage.id,
        suggestedPrompts,
      },
      { status: 200 },
    );
  } catch (err) {
    return await apiErrorHandler(err);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { uuid } = await params;

    const story = await prismaClient.story.findUnique({
      where: { uuid: uuid },
      include: {
        conversationHistory: {
          include: {
            messages: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!story) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    if (story.userId !== user.id) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    const historyData = story.conversationHistory;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatSessionReference = Array.isArray(historyData)
      ? historyData[0]
      : historyData;

    const messagesFromDb = chatSessionReference?.messages || [];

    // Map messages to include dbId for frontend use
    const messages = messagesFromDb.map(
      (msg: { id: number; [key: string]: any }) => ({
        ...msg,
        id: msg.id.toString(), // Convert to string for React keys
        dbId: msg.id, // Keep numeric ID for API calls
      }),
    );

    return NextResponse.json(
      {
        messages,
      },
      { status: 200 },
    );
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
