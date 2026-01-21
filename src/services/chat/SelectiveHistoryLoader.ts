import type { PrismaClient } from "@prisma/client";
import logger from "@/lib/logger";
import type { ChatMessage, MessageType } from "@/types/chat";
import type { NarrativeCommand } from "./CommandDetector";

/**
 * Configuração de carregamento para cada tipo de comando
 */
interface CommandLoadingConfig {
  messageTypes: Array<{
    type: MessageType;
    limit: number;
    skip?: number;
  }>;
  includeImportant?: boolean;
  importantDaysLimit?: number;
  maxImportantMessages?: number;
}

/**
 * Resultado do carregamento seletivo de histórico
 */
export interface SelectiveHistoryResult {
  messages: ChatMessage[];
  stats: {
    totalMessages: number;
    byType: Record<MessageType, number>;
  };
}

/**
 * Service responsável por carregar histórico seletivamente
 * baseado no comando detectado
 */
export class SelectiveHistoryLoader {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Configuração de carregamento para cada tipo de comando
   */
  private readonly LOADING_CONFIGS: Record<
    NarrativeCommand,
    CommandLoadingConfig
  > = {
    GERAR_DECA: {
      messageTypes: [
        { type: "SECTION_STRUCTURE", limit: 1 },
        { type: "SECTION_CONTENT", limit: 1 }, // Última seção
        { type: "DECA", limit: 1 }, // Último DECA
        { type: "SECTION_CONTENT", limit: 3, skip: 1 }, // 3 anteriores à última
      ],
    },
    SUGERIR_PROXIMA_SECAO: {
      messageTypes: [
        { type: "DECA", limit: 1 }, // Último DECA
        { type: "GENERAL", limit: 10 }, // Últimas 10 conversas
        { type: "SECTION_CONTENT", limit: 15 }, // Últimas 10 seções
        { type: "SECTION_PROPOSAL", limit: 1 }, // Última proposta
      ],
      includeImportant: true,
      importantDaysLimit: 30,
      maxImportantMessages: 5,
    },
    SUGERIR_ESTRUTURA_DE_SECOES: {
      messageTypes: [
        { type: "DECA", limit: 1 }, // Último DECA
        { type: "GENERAL", limit: 10 }, // Últimas 10 conversas
        { type: "SECTION_CONTENT", limit: 15 }, // Últimas 10 seções
        { type: "SECTION_PROPOSAL", limit: 3 }, // Últimas 3 propostas
      ],
      includeImportant: true,
      maxImportantMessages: 10,
    },
    APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA: {
      messageTypes: [
        { type: "SECTION_STRUCTURE", limit: 1 }, // Última estrutura proposta
        { type: "DECA", limit: 1 }, // Último DECA
        { type: "SECTION_CONTENT", limit: 5 }, // Últimas 5 seções
      ],
      includeImportant: true,
      maxImportantMessages: 5,
    },
    APROVAR_E_SELAR_ESBOÇO: {
      messageTypes: [
        { type: "SECTION_PROPOSAL", limit: 1 }, // Última proposta
        { type: "SECTION_CONTENT", limit: 3 }, // Últimas 3 seções
        { type: "GENERAL", limit: 15 }, // Últimas 15 conversas
        { type: "DECA", limit: 1 }, // Último DECA
      ],
    },
    REVISAR_E_CORRIGIR: {
      messageTypes: [
        { type: "SECTION_CONTENT", limit: 1 }, // Última seção
        { type: "SECTION_PROPOSAL", limit: 1 }, // Última proposta
      ],
    },
    PAUSAR_NARRATIVA: {
      messageTypes: [
        { type: "DECA", limit: 10 }, // Últimos 10 DECA
        { type: "GENERAL", limit: 8 }, // Últimas 8 conversas
        { type: "SECTION_CONTENT", limit: 10 }, // Últimas 10 seções
      ],
    },
    RETOMAR_NARRATIVA: {
      messageTypes: [
        { type: "DECA", limit: 1 }, // Apenas o último DECA
      ],
    },
    GENERAL: {
      // Fallback: carrega um pouco de cada tipo
      messageTypes: [
        { type: "DECA", limit: 1 },
        { type: "SECTION_CONTENT", limit: 3 },
        { type: "SECTION_PROPOSAL", limit: 1 },
      ],
      includeImportant: true,
      maxImportantMessages: 3,
    },
  };

  /**
   * Carrega histórico seletivo baseado no comando detectado
   */
  async loadSelectiveHistory(
    command: NarrativeCommand,
    conversationHistoryId: number,
  ): Promise<SelectiveHistoryResult> {
    const config = this.LOADING_CONFIGS[command];
    const allMessages: ChatMessage[] = [];
    const typeStats: Record<string, number> = {};

    logger.info(
      {
        command,
        conversationHistoryId,
        config,
      },
      "Carregando histórico seletivo",
    );

    // Carregar mensagens por tipo
    for (const { type, limit, skip = 0 } of config.messageTypes) {
      const messages = await this.getLastMessagesByType(
        conversationHistoryId,
        type,
        limit,
        skip,
      );

      allMessages.push(...messages);
      typeStats[type as string] =
        (typeStats[type as string] || 0) + messages.length;
    }

    // Carregar mensagens importantes se configurado
    if (config.includeImportant) {
      const importantMessages = await this.getImportantMessages(
        conversationHistoryId,
        config.maxImportantMessages || 5,
        config.importantDaysLimit,
      );

      allMessages.push(...importantMessages);
      typeStats.IMPORTANT = importantMessages.length;
    }

    // Remover duplicatas (por ID) e ordenar cronologicamente
    const uniqueMessages = this.deduplicateAndSort(allMessages);

    logger.info(
      {
        command,
        totalMessages: uniqueMessages.length,
        byType: typeStats,
      },
      "Histórico seletivo carregado",
    );

    return {
      messages: uniqueMessages,
      stats: {
        totalMessages: uniqueMessages.length,
        byType: typeStats as Record<MessageType, number>,
      },
    };
  }

  /**
   * Busca últimas N mensagens de um tipo específico
   */
  private async getLastMessagesByType(
    conversationHistoryId: number,
    messageType: MessageType,
    limit: number,
    skip: number = 0,
  ): Promise<ChatMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationHistoryId,
        messageType,
        isMeta: false, // Não incluir mensagens meta
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    });

    return messages.map((msg) => ({
      ...msg,
      createdAt: msg.createdAt,
      conversationHistoryId: msg.conversationHistoryId,
    }));
  }

  /**
   * Busca mensagens marcadas como importantes
   */
  private async getImportantMessages(
    conversationHistoryId: number,
    maxMessages: number,
    daysLimit?: number,
  ): Promise<ChatMessage[]> {
    const dateFilter = daysLimit
      ? {
          gte: new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000),
        }
      : undefined;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationHistoryId,
        important: true,
        isMeta: false,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
      take: maxMessages,
    });

    return messages.map((msg) => ({
      ...msg,
      createdAt: msg.createdAt,
      conversationHistoryId: msg.conversationHistoryId,
    }));
  }

  /**
   * Remove mensagens duplicadas e ordena cronologicamente
   */
  private deduplicateAndSort(messages: ChatMessage[]): ChatMessage[] {
    // Usar Map para remover duplicatas por ID
    const uniqueMap = new Map<number, ChatMessage>();
    for (const msg of messages) {
      if (!uniqueMap.has(msg.id)) {
        uniqueMap.set(msg.id, msg);
      }
    }

    // Ordenar cronologicamente (mais antigas primeiro)
    return Array.from(uniqueMap.values()).sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
}
