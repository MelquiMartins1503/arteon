import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildBlockSummaryPrompt,
  buildConsolidatedSummaryPrompt,
  buildInitialChatSystemPrompt,
  buildSuggestedPromptsPrompt,
  buildSummaryPrompt,
  IDEALIZATION_END_MESSAGE_MODEL,
  IDEALIZATION_END_MESSAGE_USER,
} from "@/features/story/prompts/chat";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";

const bodySchema = z.object({
  prompt: z.string().min(1, "O campo prompt é obrigatório"),
  important: z.boolean().default(false),
  isMeta: z.boolean().default(false),
  generateSuggestions: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();

    const { uuid } = await params;

    const body = await request.json();
    const { prompt, important, isMeta, generateSuggestions } =
      bodySchema.parse(body);

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
    // dependendo da versão do cliente ou do esquema.
    const historyData = story.conversationHistory;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatSessionReference = Array.isArray(historyData)
      ? historyData[0]
      : historyData;

    if (!chatSessionReference) {
      throw new HttpExceptionClient(
        404,
        "Histórico de conversas não encontrado",
      );
    }

    // Buscar mensagens explicitamente para garantir disponibilidade e ordem correta
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

    // INTERCEPTAÇÃO DE COMANDO: FINALIZAR IDEALIZAÇÃO
    if (prompt.trim() === "[FINALIZAR IDEALIZAÇÃO]") {
      // 1. Salvar mensagem do usuário (substituindo o comando pelo texto formal)
      await prismaClient.message.create({
        data: {
          content: IDEALIZATION_END_MESSAGE_USER,
          role: "USER",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: false,
          isMeta: true, // Comando de sistema
        },
      });

      // 2. Salvar resposta do modelo (texto de confirmação)
      await prismaClient.message.create({
        data: {
          content: IDEALIZATION_END_MESSAGE_MODEL,
          role: "MODEL",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: false,
          isMeta: true, // Comando de sistema
        },
      });

      // 3. Retornar resposta imediata sem chamar Gemini
      return NextResponse.json(
        {
          message: IDEALIZATION_END_MESSAGE_MODEL,
          suggestedPrompts: [],
        },
        { status: 200 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new HttpExceptionServer(500, "Chave de API não encontrada");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });

    const _RECENT_LIMIT = 15;
    const MAX_MESSAGE_LENGTH = 1500;
    const _IMPORTANT_SUMMARY_THRESHOLD = 7500;

    async function _summarizeMessage(
      messageContent: string,
      genAI: GoogleGenerativeAI,
    ): Promise<string> {
      try {
        const summaryModel = genAI.getGenerativeModel({
          model: "gemini-2.5-pro",
        });

        const summaryPrompt = buildSummaryPrompt(messageContent);

        const result = await summaryModel.generateContent(summaryPrompt);
        return result.response.text().trim();
      } catch (error) {
        logger.error({ error }, "Erro ao gerar resumo");
        // Fallback: truncar se a IA falhar
        return `${messageContent.substring(0, MAX_MESSAGE_LENGTH)}...`;
      }
    }

    async function buildOptimizedHistory(
      messages: Array<{
        id: number;
        content: string;
        role: string;
        important: boolean;
        summary: string | null;
      }>,
      genAI: GoogleGenerativeAI,
    ) {
      // ========================================================================
      // CONFIGURAÇÃO DO SISTEMA DE MEMÓRIA HIERÁRQUICA
      // ========================================================================

      const IMMEDIATE_MEMORY = 15; // Últimas 15 mensagens completas
      const MID_TERM_BLOCK_SIZE = 10; // Blocos de 10 mensagens para resumo médio
      const CONSOLIDATION_THRESHOLD = 50; // Acima de 50 mensagens antigas, criar resumo global

      // ========================================================================
      // FASE 0: FILTRAR MENSAGENS INTERROMPIDAS
      // ========================================================================

      const interruptionContent = "*Geração interrompida pelo usuário.*";
      const skipIds = new Set<number>();

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (
          msg &&
          msg.role === "MODEL" &&
          msg.content === interruptionContent
        ) {
          skipIds.add(msg.id);
          const prevMsg = messages[i - 1];
          if (i > 0 && prevMsg && prevMsg.role === "USER") {
            skipIds.add(prevMsg.id);
          }
        }
      }

      const cleanMessages = messages.filter((m) => !skipIds.has(m.id));

      // ========================================================================
      // FASE 1: SEPARAR MEMÓRIA IMEDIATA (COMPLETA)
      // ========================================================================

      const recentMessages = cleanMessages.slice(-IMMEDIATE_MEMORY);
      const recentIds = new Set(recentMessages.map((m) => m.id));
      const oldMessages = cleanMessages.filter((m) => !recentIds.has(m.id));

      // Se não há mensagens antigas, retornar apenas as recentes
      if (oldMessages.length === 0) {
        return recentMessages.map((message) => ({
          role:
            message.role === "USER" ? ("user" as const) : ("model" as const),
          parts: [{ text: message.content }],
        }));
      }

      // ========================================================================
      // FASE 2: PROCESSAR MEMÓRIA DE LONGO PRAZO (RESUMO CONSOLIDADO)
      // ========================================================================

      let consolidatedSummary: string | null = null;

      if (oldMessages.length >= CONSOLIDATION_THRESHOLD) {
        // Buscar resumo consolidado existente no primeiro bloco de mensagens antigas
        const firstOldMessage = oldMessages[0];

        if (!firstOldMessage) {
          logger.warn("Primeira mensagem antiga não encontrada");
        } else {
          // Verificar se já existe um resumo consolidado salvo
          // (usamos o campo summary da primeira mensagem antiga como cache)
          if (firstOldMessage.summary?.startsWith("[CONSOLIDADO]")) {
            consolidatedSummary = firstOldMessage.summary.replace(
              "[CONSOLIDADO] ",
              "",
            );
            logger.info("Usando resumo consolidado em cache");
          } else {
            // Gerar novo resumo consolidado de TODAS as mensagens antigas
            logger.info(
              `Gerando resumo consolidado de ${oldMessages.length} mensagens antigas`,
            );

            const summaryModel = genAI.getGenerativeModel({
              model: "gemini-2.5-pro",
            });

            const consolidatedPrompt = buildConsolidatedSummaryPrompt(
              oldMessages.map((m) => ({ role: m.role, content: m.content })),
            );

            const result =
              await summaryModel.generateContent(consolidatedPrompt);
            consolidatedSummary = result.response.text().trim();

            // Salvar o resumo consolidado no banco (na primeira mensagem antiga)
            await prismaClient.message.update({
              where: { id: firstOldMessage.id },
              data: { summary: `[CONSOLIDADO] ${consolidatedSummary}` },
            });

            logger.info("Resumo consolidado gerado e salvo");
          }
        }
      }

      // ========================================================================
      // FASE 3: PROCESSAR MEMÓRIA DE MÉDIO PRAZO (BLOCOS RESUMIDOS)
      // ========================================================================

      const midTermMemory: Array<{ role: string; content: string }> = [];

      if (oldMessages.length < CONSOLIDATION_THRESHOLD) {
        // Se não atingiu o threshold para consolidação, processar em blocos

        for (let i = 0; i < oldMessages.length; i += MID_TERM_BLOCK_SIZE) {
          const block = oldMessages.slice(i, i + MID_TERM_BLOCK_SIZE);

          // Verificar se alguma mensagem do bloco tem resumo de bloco
          const blockWithSummary = block.find((m) =>
            m.summary?.startsWith("[BLOCO]"),
          );

          if (blockWithSummary?.summary) {
            // Usar resumo existente
            midTermMemory.push({
              role: "user",
              content: blockWithSummary.summary.replace("[BLOCO] ", ""),
            });
          } else {
            // Gerar resumo do bloco
            const summaryModel = genAI.getGenerativeModel({
              model: "gemini-2.5-pro",
            });

            const blockPrompt = buildBlockSummaryPrompt(
              block.map((m) => ({ role: m.role, content: m.content })),
            );

            const result = await summaryModel.generateContent(blockPrompt);
            const blockSummary = result.response.text().trim();

            // Salvar resumo na primeira mensagem do bloco
            const firstBlockMessage = block[0];
            if (firstBlockMessage) {
              await prismaClient.message.update({
                where: { id: firstBlockMessage.id },
                data: { summary: `[BLOCO] ${blockSummary}` },
              });
            }

            midTermMemory.push({
              role: "user",
              content: blockSummary,
            });
          }
        }
      }

      // ========================================================================
      // FASE 4: MONTAR HISTÓRICO FINAL
      // ========================================================================

      const finalHistory: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }> = [];

      // 1. Adicionar resumo consolidado (se existir)
      if (consolidatedSummary) {
        finalHistory.push({
          role: "user",
          parts: [
            {
              text: `[MEMÓRIA DE LONGO PRAZO - Resumo da conversa anterior]\n\n${consolidatedSummary}`,
            },
          ],
        });
      }

      // 2. Adicionar blocos de médio prazo (se existirem)
      if (midTermMemory.length > 0) {
        for (const mem of midTermMemory) {
          finalHistory.push({
            role: "user",
            parts: [
              {
                text: `[MEMÓRIA DE MÉDIO PRAZO]\n\n${mem.content}`,
              },
            ],
          });
        }
      }

      // 3. Adicionar mensagens recentes completas
      for (const message of recentMessages) {
        finalHistory.push({
          role:
            message.role === "USER" ? ("user" as const) : ("model" as const),
          parts: [{ text: message.content }],
        });
      }

      logger.info(
        {
          totalMessages: cleanMessages.length,
          oldMessages: oldMessages.length,
          recentMessages: recentMessages.length,
          hasConsolidatedSummary: !!consolidatedSummary,
          midTermBlocks: midTermMemory.length,
          finalHistorySize: finalHistory.length,
        },
        "Histórico otimizado construído",
      );

      return finalHistory;
    }

    // ============================================================================
    // CONSTRUIR HISTÓRICO OTIMIZADO
    // ============================================================================
    const history = await buildOptimizedHistory(
      conversationHistoryWithMessages.messages,
      genAI,
    );

    // Iniciar sessão de chat com histórico existente + Prompt inicial do sistema
    // O Prompt inicial é injetado como as primeiras mensagens para definir o comportamento
    const initialSystemPrompt = buildInitialChatSystemPrompt(
      conversationHistoryWithMessages.customPrompt,
    );

    // Converter o formato do prompt inicial (que já está no formato do Gemini) para o histórico
    const fullHistory = [...initialSystemPrompt, ...history];

    const chat = model.startChat({
      history: fullHistory,
      generationConfig: {
        temperature: 0.7,
        //maxOutputTokens: 2048,
      },
    });

    // Enviar mensagem do usuário (Stream para permitir cancelamento)
    const result = await chat.sendMessageStream(prompt);

    let responseText = "";
    let wasInterrupted = false;

    try {
      for await (const chunk of result.stream) {
        // Verificar cancelamento a cada chunk
        if (request.signal.aborted) {
          logger.warn("Requisição abortada pelo cliente durante a geração.");
          wasInterrupted = true;
          // Interromper o loop (o stream do Gemini continua no lado deles, mas paramos de processar)
          break;
        }
        const chunkText = chunk.text();
        responseText += chunkText;
      }
    } catch (streamError) {
      logger.error({ streamError }, "Erro durante o stream do Gemini");
      // Se tivermos algum texto parcial, podemos continuar ou relançar.
      // Vamos tentar usar o que gerou até agora se não for vazio
      if (!responseText) throw streamError;
    }

    // Verificar novamente após o loop se houve interrupção
    if (request.signal.aborted && !wasInterrupted) {
      wasInterrupted = true;
      logger.warn("Requisição abortada detectada após o loop de streaming.");
    }

    // ============================================================================
    // DETECÇÃO AUTOMÁTICA DE COMANDOS IMPORTANTES
    // ============================================================================

    // Detectar se a mensagem contém comandos importantes
    const hasApproveCommand = prompt.includes("[APROVAR E SELAR ESBOÇO]");
    const hasReviewCommand = prompt.includes("[REVISAR E CORRIGIR SEÇÃO]");

    // Se contém algum comando, forçar important = true (sobrescreve o valor enviado)
    const isImportantMessage =
      hasApproveCommand || hasReviewCommand || important;

    if (hasApproveCommand) {
      logger.info(
        "Comando [APROVAR E SELAR ESBOÇO] detectado - marcando mensagem como importante",
      );
    }

    if (hasReviewCommand) {
      logger.info(
        "Comando [REVISAR E CORRIGIR SEÇÃO] detectado - marcando mensagem como importante",
      );
    }

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

    // Se houve interrupção, salvar apenas a mensagem de interrupção
    if (wasInterrupted) {
      const interruptedMessage = await prismaClient.message.create({
        data: {
          content: "*Geração interrompida pelo usuário.*",
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

    // Se não houve interrupção, salvar resposta do modelo normalmente
    const savedModelMessage = await prismaClient.message.create({
      data: {
        content: responseText,
        role: "MODEL",
        conversationHistoryId: conversationHistoryWithMessages.id,
        important: isImportantMessage, // Herdar flag de importante (incluindo detecção de comandos)
        isMeta: isMeta, // Herdar flag de meta da mensagem do usuário
      },
    });

    async function generateSuggestedPrompts(
      history: any[],
      lastResponse: string,
      genAI: GoogleGenerativeAI,
    ): Promise<string[]> {
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-pro",
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        });

        const prompt = buildSuggestedPromptsPrompt(history, lastResponse);

        // Forcing a fresh chat session to avoid role errors
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(prompt);
        const text = result.response.text();
        logger.error({ text }, "DEBUG RAW GEMINI RESPONSE");

        try {
          // Tentar extrair o array JSON usando regex
          const match = text.match(/\[[\s\S]*\]/);
          if (match) {
            const cleanedText = match[0];
            const parsed = JSON.parse(cleanedText);
            if (
              Array.isArray(parsed) &&
              parsed.every((s) => typeof s === "string")
            ) {
              return parsed.slice(0, 3);
            }
          }

          logger.error("DEBUG Falha no parse ou array vazio, usando fallback.");
          return ["Continuar", "Explorar mais", "Fazer uma pergunta"];
        } catch (e) {
          logger.error({ error: e }, "Erro ao fazer parse das sugestões");
          return ["Continuar", "Explorar mais", "Fazer uma pergunta"];
        }
      } catch (error) {
        logger.error({ error }, "Erro ao gerar sugestões (API)");
        return ["Continuar", "Explorar mais", "Fazer uma pergunta"];
      }
    }

    // Gerar sugestões em paralelo (apenas nas fases apropriadas)
    let suggestedPrompts: string[] = [];

    if (generateSuggestions) {
      suggestedPrompts = await generateSuggestedPrompts(
        history,
        responseText,
        genAI,
      );
    }

    return NextResponse.json(
      {
        message: responseText,
        messageId: savedModelMessage.id, // Returning the real DB ID
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
