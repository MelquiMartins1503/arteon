import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import type { ChatMessage } from "@/types/chat";

/**
 * Service para formatar e injetar knowledge base no contexto
 */
export class KnowledgeBaseFormatter {
  /**
   * Carrega e formata knowledge base como mensagens
   */
  async loadKnowledgeBaseAsMessages(storyId: string): Promise<ChatMessage[]> {
    try {
      // Carregar top 30 entidades
      const entities = await prismaClient.storyEntity.findMany({
        where: {
          storyId,
          status: "ACTIVE",
        },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: 30,
      });

      if (entities.length === 0) {
        return [];
      }

      const kbContent = this.formatKnowledgeBase(entities);

      // Retornar como par user/model
      return [
        {
          id: -1,
          role: "USER",
          content: kbContent,
          conversationHistoryId: 0,
          important: true,
          isMeta: true,
          messageType: "SYSTEM",
          summary: null,
          createdAt: new Date(0), // Primeira no histórico
        },
        {
          id: -2,
          role: "MODEL",
          content:
            "Recebi a base de conhecimento. Vou manter consistência absoluta.",
          conversationHistoryId: 0,
          important: true,
          isMeta: true,
          messageType: "SYSTEM",
          summary: null,
          createdAt: new Date(0),
        },
      ];
    } catch (error) {
      logger.error({ error }, "Erro ao carregar knowledge base");
      return [];
    }
  }

  /**
   * Formata entidades para contexto
   */
  private formatKnowledgeBase(
    entities: Array<{
      type: string;
      name: string;
      aliases: string[];
      description: string;
      attributes: unknown;
      importance: number;
    }>,
  ): string {
    const grouped: Record<string, typeof entities> = {};
    for (const entity of entities) {
      if (!grouped[entity.type]) {
        grouped[entity.type] = [];
      }
      grouped[entity.type]?.push(entity); // Safe: initialized above
    }

    const typeOrder = [
      "CHARACTER",
      "LOCATION",
      "EVENT",
      "OBJECT",
      "CONCEPT",
      "FACTION",
      "DECISION",
      "RELATIONSHIP",
    ];

    let kb = "## 📚 BASE DE CONHECIMENTO CANÔNICA\n\n";
    kb += "ESTAS SÃO AS INFORMAÇÕES OFICIAIS E ATUALIZADAS DA HISTÓRIA.\n";
    kb += "Mantenha ABSOLUTA CONSISTÊNCIA:\n\n";

    for (const type of typeOrder) {
      const items = grouped[type];
      if (!items || items.length === 0) continue;

      kb += `### ${this.translateType(type)}\n\n`;

      for (const entity of items.slice(0, 10)) {
        kb += `**${entity.name}**`;
        if (entity.aliases.length > 0) {
          kb += ` (também: ${entity.aliases.join(", ")})`;
        }
        kb += `\n${entity.description}\n`;

        const attrs = this.extractCriticalAttributes(entity.attributes);
        if (attrs.length > 0) {
          kb += `${attrs.map((a) => `- ${a}`).join("\n")}\n`;
        }
        kb += "\n";
      }
    }

    kb += "---\n\n";
    return kb;
  }

  private translateType(type: string): string {
    const translations: Record<string, string> = {
      CHARACTER: "Personagens",
      LOCATION: "Locais",
      OBJECT: "Objetos Importantes",
      EVENT: "Eventos Significativos",
      CONCEPT: "Conceitos e Sistemas",
      FACTION: "Facções e Organizações",
      DECISION: "Decisões Importantes",
      RELATIONSHIP: "Relações",
    };
    return translations[type] || type;
  }

  private extractCriticalAttributes(attributes: unknown): string[] {
    const critical: string[] = [];

    // Verificar se attributes é um objeto válido
    if (
      !attributes ||
      typeof attributes !== "object" ||
      Array.isArray(attributes)
    ) {
      return critical;
    }

    const attrs = attributes as Record<string, unknown>;
    const keys = Object.keys(attrs);
    const priority = ["appearance", "abilities", "role", "location"];

    for (const key of priority) {
      if (attrs[key] && critical.length < 3) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        critical.push(`${label}: ${String(attrs[key])}`);
      }
    }

    for (const key of keys) {
      if (!priority.includes(key) && critical.length < 3) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        critical.push(`${label}: ${String(attrs[key])}`);
      }
    }

    return critical;
  }
}
