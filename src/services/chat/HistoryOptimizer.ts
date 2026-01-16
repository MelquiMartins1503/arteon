import type { GoogleGenerativeAI } from "@google/generative-ai";
import { CHAT_CONFIG } from "@/config/chat.config";
import logger from "@/lib/logger";
import type {
  ChatMessage,
  GeminiMessage,
  OptimizedHistoryInfo,
} from "@/types/chat";
import { MessageSummarizer } from "./MessageSummarizer";

/**
 * Serviço para otimizar o histórico de conversas usando memória hierárquica
 */
export class HistoryOptimizer {
  private summarizer: MessageSummarizer;

  constructor(
    private genAI: GoogleGenerativeAI,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private prisma: any, // Aceita PrismaClient estendido
  ) {
    this.summarizer = new MessageSummarizer(genAI);
  }

  /**
   * Constrói histórico otimizado com sistema de memória hierárquica
   */
  async buildOptimizedHistory(
    messages: ChatMessage[],
  ): Promise<GeminiMessage[]> {
    const { IMMEDIATE_MEMORY, MID_TERM_BLOCK_SIZE, CONSOLIDATION_THRESHOLD } =
      this.getMemoryConfig();

    // ========================================================================
    // FASE 0: FILTRAR MENSAGENS INTERROMPIDAS
    // ========================================================================
    const cleanMessages = this.filterInterruptedMessages(messages);

    // ========================================================================
    // FASE 1: SEPARAR MEMÓRIA IMEDIATA (COMPLETA)
    // ========================================================================
    const recentMessages = cleanMessages.slice(-IMMEDIATE_MEMORY);
    const recentIds = new Set(recentMessages.map((m) => m.id));
    const oldMessages = cleanMessages.filter((m) => !recentIds.has(m.id));

    // Se não há mensagens antigas, retornar apenas as recentes
    if (oldMessages.length === 0) {
      return this.formatMessagesForGemini(recentMessages);
    }

    // ========================================================================
    // FASE 2: PROCESSAR MEMÓRIA DE LONGO PRAZO (RESUMO CONSOLIDADO)
    // ========================================================================
    let consolidatedSummary: string | null = null;

    if (oldMessages.length >= CONSOLIDATION_THRESHOLD) {
      consolidatedSummary =
        await this.getOrCreateConsolidatedSummary(oldMessages);
    }

    // ========================================================================
    // FASE 3: PROCESSAR MEMÓRIA DE MÉDIO PRAZO (BLOCOS RESUMIDOS)
    // ========================================================================
    const midTermMemory: Array<{ role: string; content: string }> = [];

    if (oldMessages.length < CONSOLIDATION_THRESHOLD) {
      midTermMemory.push(
        ...(await this.processBlockSummaries(oldMessages, MID_TERM_BLOCK_SIZE)),
      );
    }

    // ========================================================================
    // FASE 4: MONTAR HISTÓRICO FINAL
    // ========================================================================
    const finalHistory = this.assembleFinalHistory(
      consolidatedSummary,
      midTermMemory,
      recentMessages,
    );

    // Log de informações
    this.logOptimizationInfo({
      totalMessages: cleanMessages.length,
      oldMessages: oldMessages.length,
      recentMessages: recentMessages.length,
      hasConsolidatedSummary: !!consolidatedSummary,
      midTermBlocks: midTermMemory.length,
      finalHistorySize: finalHistory.length,
    });

    // Calcular e logar estimativa de tokens
    const estimatedTokens = this.calculateEstimatedTokens(finalHistory);
    logger.info(
      {
        estimatedTokens,
        isLarge: estimatedTokens > 25000,
        percentOfMax: Math.round((estimatedTokens / 1000000) * 100),
      },
      "Estimativa de tokens do histórico",
    );

    // Aviso se ainda muito grande
    if (estimatedTokens > 25000) {
      logger.warn(
        {
          estimatedTokens,
          currentConfig: {
            immediateMessages: IMMEDIATE_MEMORY,
            consolidationThreshold: CONSOLIDATION_THRESHOLD,
          },
        },
        "Histórico ainda grande após otimização",
      );
    }

    return finalHistory;
  }

  /**
   * Filtra mensagens interrompidas pelo usuário
   */
  private filterInterruptedMessages(messages: ChatMessage[]): ChatMessage[] {
    const skipIds = new Set<number>();

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg) continue;

      if (
        msg.role === "MODEL" &&
        msg.content === CHAT_CONFIG.commands.interruptionMarker
      ) {
        skipIds.add(msg.id);

        // Remover também a mensagem do usuário anterior
        const prevMsg = messages[i - 1];
        if (i > 0 && prevMsg && prevMsg.role === "USER") {
          skipIds.add(prevMsg.id);
        }
      }
    }

    return messages.filter((m) => !skipIds.has(m.id));
  }

  /**
   * Obtém ou cria resumo consolidado de mensagens antigas
   */
  private async getOrCreateConsolidatedSummary(
    oldMessages: ChatMessage[],
  ): Promise<string | null> {
    const firstOldMessage = oldMessages[0];
    if (!firstOldMessage) {
      logger.warn("Primeira mensagem antiga não encontrada");
      return null;
    }

    // Verificar se já existe resumo consolidado em cache
    if (firstOldMessage.summary?.startsWith("[CONSOLIDADO]")) {
      logger.info("Usando resumo consolidado em cache");
      return firstOldMessage.summary.replace("[CONSOLIDADO] ", "");
    }

    // Gerar novo resumo consolidado
    logger.info(
      `Gerando resumo consolidado de ${oldMessages.length} mensagens antigas`,
    );

    const summary = await this.summarizer.createConsolidatedSummary(
      oldMessages.map((m) => ({ role: m.role, content: m.content })),
    );

    // Salvar no banco
    await this.prisma.message.update({
      where: { id: firstOldMessage.id },
      data: { summary: `[CONSOLIDADO] ${summary}` },
    });

    logger.info("Resumo consolidado gerado e salvo");
    return summary;
  }

  /**
   * Processa resumos de blocos de mensagens
   */
  private async processBlockSummaries(
    oldMessages: ChatMessage[],
    blockSize: number,
  ): Promise<Array<{ role: string; content: string }>> {
    const midTermMemory: Array<{ role: string; content: string }> = [];

    for (let i = 0; i < oldMessages.length; i += blockSize) {
      const block = oldMessages.slice(i, i + blockSize);

      // Verificar se alguma mensagem do bloco tem resumo
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
        // Gerar novo resumo do bloco
        const blockSummary = await this.summarizer.createBlockSummary(
          block.map((m) => ({ role: m.role, content: m.content })),
        );

        // Salvar resumo na primeira mensagem do bloco
        const firstBlockMessage = block[0];
        if (firstBlockMessage) {
          await this.prisma.message.update({
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

    return midTermMemory;
  }

  /**
   * Monta o histórico final com todas as camadas de memória
   */
  private assembleFinalHistory(
    consolidatedSummary: string | null,
    midTermMemory: Array<{ role: string; content: string }>,
    recentMessages: ChatMessage[],
  ): GeminiMessage[] {
    const finalHistory: GeminiMessage[] = [];

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

    // 2. Adicionar blocos de médio prazo
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

    // 3. Adicionar mensagens recentes completas
    finalHistory.push(...this.formatMessagesForGemini(recentMessages));

    return finalHistory;
  }

  /**
   * Formata mensagens para o formato do Gemini API
   */
  private formatMessagesForGemini(messages: ChatMessage[]): GeminiMessage[] {
    return messages.map((message) => ({
      role: message.role === "USER" ? ("user" as const) : ("model" as const),
      parts: [{ text: message.content }],
    }));
  }

  /**
   * Obtém configuração de memória
   */
  private getMemoryConfig() {
    return {
      IMMEDIATE_MEMORY: CHAT_CONFIG.memory.immediateMessages,
      MID_TERM_BLOCK_SIZE: CHAT_CONFIG.memory.midTermBlockSize,
      CONSOLIDATION_THRESHOLD: CHAT_CONFIG.memory.consolidationThreshold,
    };
  }

  /**
   * Loga informações sobre a otimização
   */
  private logOptimizationInfo(info: OptimizedHistoryInfo): void {
    logger.info(info, "Histórico otimizado construído");
  }

  /**
   * Calcula estimativa de tokens do histórico
   */
  private calculateEstimatedTokens(history: GeminiMessage[]): number {
    return history.reduce((acc, msg) => {
      const textLength = msg.parts.reduce(
        (sum, part) => sum + part.text.length,
        0,
      );
      // Aproximadamente 1 token = 4 caracteres
      return acc + Math.ceil(textLength / 4);
    }, 0);
  }
}
