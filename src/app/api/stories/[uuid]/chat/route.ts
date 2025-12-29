import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
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
          important: true, // Marco importante
          isMeta: true, // Comando de sistema
        },
      });

      // 2. Salvar resposta do modelo (texto de confirmação)
      await prismaClient.message.create({
        data: {
          content: IDEALIZATION_END_MESSAGE_MODEL,
          role: "MODEL",
          conversationHistoryId: conversationHistoryWithMessages.id,
          important: true, // Marco importante
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

    const RECENT_LIMIT = 15;
    const MAX_MESSAGE_LENGTH = 1500;
    const IMPORTANT_SUMMARY_THRESHOLD = 7500;

    async function summarizeMessage(
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
      // 0. Filtrar mensagens interrompidas e suas perguntas correspondentes
      const interruptionContent = "*Geração interrompida pelo usuário.*";
      const skipIds = new Set<number>();

      // First pass: identify messages to skip
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (
          msg &&
          msg.role === "MODEL" &&
          msg.content === interruptionContent
        ) {
          skipIds.add(msg.id);
          // Try to find and skip the previous user message
          const prevMsg = messages[i - 1];
          if (i > 0 && prevMsg && prevMsg.role === "USER") {
            skipIds.add(prevMsg.id);
          }
        }
      }

      // Filtrar mensagens
      const cleanMessages = messages.filter((m) => !skipIds.has(m.id));

      // 1. Identificar mensagens recentes (manter contexto completo)
      const recentMessages = cleanMessages.slice(-RECENT_LIMIT);
      const recentIds = new Set(recentMessages.map((m) => m.id));

      // 2. Identificar mensagens antigas
      const oldMessages = cleanMessages.filter((m) => !recentIds.has(m.id));

      // 3. Processar/Resumir mensagens antigas
      const processedOldMessages = await Promise.all(
        oldMessages.map(async (message) => {
          // Se é importante
          if (message.important) {
            // Se é longa e ainda não tem resumo, gerar resumo
            if (
              message.content.length > IMPORTANT_SUMMARY_THRESHOLD &&
              !message.summary
            ) {
              const summary = await summarizeMessage(message.content, genAI);

              // Salvar resumo no banco para reutilização
              await prismaClient.message.update({
                where: { id: message.id },
                data: { summary },
              });

              return { ...message, content: summary };
            }
            // Se já tem resumo, usar o resumo
            else if (message.summary) {
              return { ...message, content: message.summary };
            }
            // Se é curta, manter completa
            else {
              return message;
            }
          }
          // Se não é importante, comprimir
          else {
            const compressed =
              message.content.length > MAX_MESSAGE_LENGTH
                ? `${message.content.substring(0, MAX_MESSAGE_LENGTH)}... [truncado]`
                : message.content;
            return { ...message, content: compressed };
          }
        }),
      );

      // 4. Combinar mensagens antigas processadas + mensagens recentes completas
      const allProcessedMessages = [...processedOldMessages, ...recentMessages];

      // 5. Mapear para formato Gemini
      return allProcessedMessages.map((message) => ({
        role: message.role === "USER" ? ("user" as const) : ("model" as const),
        parts: [{ text: message.content }],
      }));
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

    // Salvar mensagem do usuário
    await prismaClient.message.create({
      data: {
        content: prompt,
        role: "USER",
        conversationHistoryId: conversationHistoryWithMessages.id,
        important: important,
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
        important: important, // Herdar flag de importante da mensagem do usuário
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
