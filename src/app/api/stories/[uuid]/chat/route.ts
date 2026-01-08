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
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { chatRequestSchema } from "@/lib/schemas/chatRequest";
import {
  CommandDetector,
  HistoryOptimizer,
  SuggestionGenerator,
} from "@/services/chat";
import { GeminiClient } from "@/services/gemini/GeminiClient";

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
    // INTERCEPTAÇÃO DE COMANDO: FINALIZAR IDEALIZAÇÃO
    // ========================================================================
    const commandDetector = new CommandDetector();

    if (commandDetector.isFinalizeIdealizationCommand(prompt)) {
      // Salvar mensagem do usuário
      await prismaClient.message.create({
        data: {
          content: IDEALIZATION_END_MESSAGE_USER,
          role: "USER",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: false,
          isMeta: true,
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

    // ========================================================================
    // CONSTRUIR HISTÓRICO OTIMIZADO
    // ========================================================================
    const history = await historyOptimizer.buildOptimizedHistory(
      conversationHistoryWithMessages.messages,
    );

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
        isMeta: isMeta,
        generateSuggestions: generateSuggestions,
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
