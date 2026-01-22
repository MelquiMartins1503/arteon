import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";
import { CHAT_CONFIG } from "@/config/chat.config";
import {
  buildInitialChatSystemPrompt,
  buildPauseModeOverrideMessage,
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
  MessageSummarizer,
  SelectiveHistoryLoader,
  SuggestionGenerator,
} from "@/services/chat";
import { handlePauseModeCommands } from "@/services/chat/PauseModeHandler";
import { GeminiClient } from "@/services/gemini/GeminiClient";
import {
  EntityManager,
  type ExtractionResult,
  KnowledgeBaseFormatter,
  KnowledgeExtractor,
  RelationshipManager,
} from "@/services/knowledge";
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
    const { prompt, important, isMeta, generateSuggestions, imageUrls } =
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
      prompt,
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

    const selectedModel = isInPauseMode
      ? CHAT_CONFIG.ai.pauseModel
      : CHAT_CONFIG.ai.model;

    logger.info(
      {
        model: selectedModel,
        mode: isInPauseMode ? "PAUSE (Economical)" : "NARRATIVE (Premium)",
      },
      "Selecionando modelo de IA",
    );

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      safetySettings: CHAT_CONFIG.ai.safetySettings,
    });

    const historyOptimizer = new HistoryOptimizer(genAI, prismaClient);
    const suggestionGenerator = new SuggestionGenerator(genAI);
    const geminiClient = new GeminiClient(genAI);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - prismaClient is an extended client
    const selectiveLoader = new SelectiveHistoryLoader(prismaClient);

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

    // ========================================================================
    // INJETAR KNOWLEDGE BASE (SEMPRE)
    // ========================================================================
    const kbFormatter = new KnowledgeBaseFormatter();
    const kbMessages = await kbFormatter.loadKnowledgeBaseAsMessages(
      story.uuid,
      prompt, // ✅ NOVO: UserMessage para busca semântica
      3000, // ✅ NOVO: Token budget para K adaptativo
    );

    if (kbMessages.length > 0) {
      // Converter KB para formato Gemini e injetar NO INÍCIO
      const kbHistory =
        await historyOptimizer.buildOptimizedHistory(kbMessages);
      history = [...kbHistory, ...history];

      logger.info(
        { kbEntitiesCount: kbMessages.length / 2 },
        "Knowledge Base injetada no contexto",
      );
    }

    // Injetar prompt inicial do sistema (após KB, antes do histórico)
    const initialSystemPrompt = buildInitialChatSystemPrompt(
      conversationHistoryWithMessages.customPrompt,
      isInPauseMode, // Passar modo pausa para incluir aviso se necessário
    );

    let fullHistory = [...initialSystemPrompt, ...history];

    // Injetar override de modo pausa (após histórico) quando aplicável
    if (isInPauseMode && rawCommand === "GENERAL") {
      const pauseOverride = buildPauseModeOverrideMessage();
      fullHistory = [...fullHistory, ...pauseOverride];
      logger.info("Injetando mensagem de override de modo pausa no contexto");
    }

    const chat = model.startChat({
      history: fullHistory,
      generationConfig: {
        temperature: CHAT_CONFIG.ai.temperature,
      },
    });

    // ========================================================================
    // HELPER: GERAÇÃO DE RESUMO PARA MENSAGENS LONGAS
    // ========================================================================
    const generateSummaryIfNeeded = async (
      content: string,
    ): Promise<string | null> => {
      if (content.length <= 500) return null;

      try {
        const summarizer = new MessageSummarizer(genAI);
        const summary = await summarizer.summarizeMessage(content);
        logger.info(
          { contentLength: content.length, summaryLength: summary.length },
          "📝 Summary generated for long message",
        );
        return summary;
      } catch (error) {
        logger.error({ error }, "Failed to generate summary");
        return null;
      }
    };

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
      messageClassificationCommand, // ✅ CORRIGIDO: usar comando real, não historyLoadingCommand
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
    // Calculate summary BEFORE transaction to avoid timeout (AI call can be slow)
    const userMessageSummary = await generateSummaryIfNeeded(prompt);

    // Salvar mensagem do usuário DENTRO de transação
    const savedUserMessage = await prismaClient.$transaction(async (tx) => {
      const userMessage = await tx.message.create({
        data: {
          content: prompt,
          summary: userMessageSummary,
          role: "USER",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: isImportantMessage,
          isMeta: isUserCommandMeta,
          generateSuggestions: generateSuggestions,
          messageType: userMessageType,
          imageUrls: imageUrls || [],
        },
      });

      // Marcar imagens como usadas para prevenir limpeza
      if (imageUrls && imageUrls.length > 0) {
        await tx.uploadTracking.updateMany({
          where: {
            key: { in: imageUrls },
            used: false,
          },
          data: {
            used: true,
          },
        });
      }

      return userMessage;
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
        summary: await generateSummaryIfNeeded(responseText), // NOVO: Resumo persistente
        role: "MODEL",
        conversationHistoryId: conversationHistoryWithMessages.id,
        important: isImportantMessage,
        isMeta: isMeta,
        messageType: responseMessageType,
      },
    });

    // ========================================================================
    // DETECÇÃO AUTOMÁTICA DE PAUSA PELA IA (VERIFICAÇÃO DE COERÊNCIA)
    // ========================================================================
    // Detectar se a IA pausou a narrativa devido a erro do autor
    // A IA informa a pausa em linguagem natural, não com comando formatado
    const aiPauseIndicators = [
      /pausar?\s+a?\s*narrativa/i,
      /detectei\s+(?:um\s+)?erro/i,
      /identificou-se\s+(?:uma\s+)?viola[çc][ãa]o/i,
      /inconsist[êe]ncia\s+detectada/i,
      /conflito\s+com/i,
      /n[ãa]o\s+(?:posso|poderei)\s+(?:prosseguir|continuar)/i,
    ];

    const aiInitiatedPause = aiPauseIndicators.some(
      (pattern) => pattern.test(responseText.substring(0, 500)), // Checar primeiros 500 chars
    );

    if (aiInitiatedPause && !isInPauseMode) {
      try {
        await prismaClient.conversationHistory.update({
          where: { id: conversationHistoryWithMessages.id },
          data: { pauseNarrativeMode: true },
        });

        logger.info(
          {
            conversationHistoryId: conversationHistoryWithMessages.id,
            trigger: "AI_INITIATED_PAUSE",
            messagePreview: responseText.substring(0, 200),
          },
          "🤖 IA pausou automaticamente a narrativa (Verificação de Coerência)",
        );
      } catch (error) {
        logger.error(
          { error },
          "Erro ao registrar pausa automática iniciada pela IA",
        );
      }
    }

    // ========================================================================
    // EXTRAÇÃO AUTOMÁTICA DE CONHECIMENTO
    // ========================================================================
    // Extrair de:
    // 1. SECTION_CONTENT (conteúdo gerado pela IA)
    // 2. SECTION_PROPOSAL (propostas podem ter informações)
    // 3. PAUSAR_NARRATIVA (conversas podem introduzir informações)
    // 4. Mensagens do USUÁRIO com comandos APROVAR ou SUGERIR (usuário passa contexto)
    const shouldExtractFromResponse =
      responseMessageType === "SECTION_CONTENT" ||
      responseMessageType === "SECTION_PROPOSAL" ||
      (responseMessageType === "GENERAL" && isInPauseMode);

    const shouldExtractFromUserInput =
      userMessageType === "SECTION_PROPOSAL" || // SUGERIR_PROXIMA_SECAO
      userMessageType === "SECTION_CONTENT"; // APROVAR_E_SELAR_ESBOÇO

    if (shouldExtractFromResponse || shouldExtractFromUserInput) {
      try {
        // Determinar de onde extrair
        const contentToExtract = shouldExtractFromUserInput
          ? prompt // Extrair do prompt do usuário
          : responseText; // Extrair da resposta da IA

        const sourceType = shouldExtractFromUserInput
          ? "user input"
          : "AI response";

        logger.info(
          {
            storyId: story.uuid,
            trigger: shouldExtractFromUserInput
              ? `User Input (${userMessageType})`
              : `AI Response (${responseMessageType})`,
            contentPreview: `${contentToExtract.substring(0, 100)}...`,
          },
          "🚀 GATILHO DETECTADO: Iniciando extração de conhecimento...",
        );

        // Carregar entidades existentes para contexto
        const existingEntities = await prismaClient.storyEntity.findMany({
          where: {
            storyId: story.uuid,
            status: "ACTIVE", // ✅ Apenas entidades ativas
          },
          select: { name: true, type: true },
        });

        // Extrair entidades e relacionamentos do conteúdo
        const extractor = new KnowledgeExtractor();
        const extractionResult: ExtractionResult =
          await extractor.extractFromContent(
            contentToExtract,
            existingEntities,
            story.uuid,
          );

        // Processar e salvar entidades
        if (extractionResult.entities.length > 0) {
          const manager = new EntityManager();
          const result = await manager.processExtractedEntities(
            story.uuid,
            extractionResult.entities,
            shouldExtractFromUserInput
              ? savedUserMessage.id
              : savedModelMessage.id,
          );

          logger.info(
            {
              storyId: story.uuid,
              source: sourceType,
              ...result,
            },
            `✅ Entidades processadas! Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`,
          );
        }

        // Processar e salvar relacionamentos
        if (extractionResult.relationships.length > 0) {
          const relationshipManager = new RelationshipManager();
          const relationshipsCreated =
            await relationshipManager.processExtractedRelationships(
              story.uuid,
              extractionResult.relationships,
              shouldExtractFromUserInput
                ? savedUserMessage.id
                : savedModelMessage.id,
            );

          logger.info(
            {
              storyId: story.uuid,
              source: sourceType,
              relationshipsCreated,
            },
            `🔗 Relacionamentos processados! Created: ${relationshipsCreated}`,
          );
        } else {
          logger.info(
            { storyId: story.uuid, source: sourceType },
            "🤷‍♂️ Extração finalizada, mas nenhuma entidade relevante foi retornada pela IA.",
          );
        }
      } catch (error) {
        // Falha silenciosa - não bloqueia o fluxo principal
        logger.error(
          { error, storyId: story.uuid },
          "Erro ao extrair conhecimento (não crítico)",
        );
      }
    }

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
      (msg: { id: { toString: () => string } }) => ({
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
