import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import type { ChatMessage } from "@/types/chat";
import { EmbeddingGenerator } from "./EmbeddingGenerator";
import { RelationshipManager } from "./RelationshipManager";

/**
 * Service para formatar e injetar knowledge base no contexto
 */
export class KnowledgeBaseFormatter {
  private embeddingGen = new EmbeddingGenerator();
  private relationshipManager = new RelationshipManager();

  /**
   * Carrega e formata knowledge base como mensagens
   *
   * @param storyId - ID da história
   * @param userMessage - Mensagem do usuário para busca semântica (opcional)
   * @param tokenBudget - Orçamento de tokens para KB (default: 3000)
   */
  async loadKnowledgeBaseAsMessages(
    storyId: string,
    userMessage?: string,
    tokenBudget: number = 6000,
  ): Promise<ChatMessage[]> {
    try {
      let entities: Array<{
        id: number;
        type: string;
        name: string;
        aliases: string[];
        description: string;
        attributes: unknown;
        importance: number;
      }>;

      if (userMessage) {
        // NOVO CAMINHO: Busca semântica (Fase 2)
        logger.info(
          { storyId, hasUserMessage: true },
          "🔍 Using semantic search for KB loading",
        );

        const messageEmbedding =
          await this.embeddingGen.generateEmbedding(userMessage);

        // Calcular K adaptativo baseado no orçamento de tokens
        const avgTokensPerEntity = 60; // Estimativa conservadora
        const maxEntities = Math.floor(tokenBudget / avgTokensPerEntity);
        const K = Math.min(maxEntities, 100); // Cap em 100 entidades

        entities = await this.searchBySimilarity(storyId, messageEmbedding, K);

        // ✅ NOVO: Expandir com relacionamentos (Fase 3.4)
        const entityIds = entities.map((e) => e.id);
        const expandedIds =
          await this.relationshipManager.expandWithRelationships(
            entityIds,
            20, // máximo 20 entidades adicionais
          );

        // Se houve expansão, carregar entidades adicionais
        if (expandedIds.size > entityIds.length) {
          const additionalIds = Array.from(expandedIds).filter(
            (id) => !entityIds.includes(id),
          );

          const additionalEntities = await prismaClient.storyEntity.findMany({
            where: {
              id: { in: additionalIds },
              status: "ACTIVE",
            },
            select: {
              id: true,
              type: true,
              name: true,
              aliases: true,
              description: true,
              attributes: true,
              importance: true,
            },
          });

          entities = [
            ...entities,
            ...additionalEntities.map((e) => ({
              id: e.id,
              type: e.type,
              name: e.name,
              aliases: e.aliases,
              description: e.description,
              attributes: e.attributes,
              importance: e.importance,
            })),
          ];

          logger.info(
            {
              semanticEntities: entityIds.length,
              expandedEntities: additionalIds.length,
              totalEntities: entities.length,
            },
            "🔗 KB expanded with relationships",
          );
        }

        logger.info(
          {
            K,
            tokenBudget,
            entitiesFound: entities.length,
          },
          "📊 Semantic KB loading complete",
        );
      } else {
        // CAMINHO ANTIGO: Fallback para importância/recência
        logger.info(
          { storyId, hasUserMessage: false },
          "📋 Using importance-based KB loading (fallback)",
        );

        entities = await prismaClient.storyEntity.findMany({
          where: {
            storyId,
            status: "ACTIVE",
          },
          select: {
            id: true,
            type: true,
            name: true,
            aliases: true,
            description: true,
            attributes: true,
            importance: true,
          },
          orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
          take: 100,
        });
      }

      logger.info(
        {
          storyId,
          entitiesLoaded: entities.length,
          typeBreakdown: entities.reduce(
            (acc, e) => {
              acc[e.type] = (acc[e.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
          topEntities: entities.slice(0, 5).map((e) => ({
            name: e.name,
            type: e.type,
            importance: e.importance,
          })),
        },
        "📚 Knowledge Base loaded for context",
      );

      if (entities.length === 0) {
        return [];
      }

      const kbContent = await this.formatKnowledgeBase(entities, storyId);

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
   * Formata entidades para contexto (com relacionamentos - Fase 3.4)
   */
  private async formatKnowledgeBase(
    entities: Array<{
      id: number;
      type: string;
      name: string;
      aliases: string[];
      description: string;
      attributes: unknown;
      importance: number;
    }>,
    storyId: string,
  ): Promise<string> {
    let kb = "# KNOWLEDGE BASE\n\n";
    kb += "**ENTIDADES RASTREADAS:**\n\n";

    // Mapear todas as entidades para lookup rápido
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    // Carregar todos os relacionamentos para as entidades carregadas
    const entityIds = entities.map((e) => e.id);
    const relationships = await prismaClient.entityRelationship.findMany({
      where: {
        storyId,
        OR: [
          { fromEntityId: { in: entityIds } },
          { toEntityId: { in: entityIds } },
        ],
      },
      orderBy: { strength: "desc" },
      take: 100, // Limitar para não sobrecarregar
    });

    for (const entity of entities) {
      const translatedType = this.translateType(entity.type);
      kb += `- **${entity.name}** (${translatedType})`;

      if (entity.aliases?.length > 0) {
        kb += ` também conhecido como: ${entity.aliases.join(", ")}`;
      }
      kb += `\n  ${entity.description}\n`;

      // ✅ NOVO (Fase 3.4): Adicionar relacionamentos relevantes
      const entityRels = relationships.filter(
        (r) =>
          (r.fromEntityId === entity.id || r.toEntityId === entity.id) &&
          r.strength >= 6, // Apenas relacionamentos fortes
      );

      if (entityRels.length > 0) {
        kb += `  **Relacionamentos:**\n`;
        for (const rel of entityRels) {
          const isOutgoing = rel.fromEntityId === entity.id;
          const relatedEntityId = isOutgoing
            ? rel.toEntityId
            : rel.fromEntityId;
          const relatedEntity = entityMap.get(relatedEntityId);

          if (relatedEntity) {
            const relTypeLabel = this.formatRelationshipType(rel.type);
            if (isOutgoing) {
              kb += `  - ${relTypeLabel} ${relatedEntity.name}\n`;
            } else {
              kb += `  - ${relatedEntity.name} ${relTypeLabel} ${entity.name}\n`;
            }
          }
        }
      }

      // Atributos
      if (entity.attributes && typeof entity.attributes === "object") {
        const attrs = entity.attributes as Record<string, unknown>;
        if (Object.keys(attrs).length > 0) {
          kb += `  Atributos: ${Object.entries(attrs)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")}\n`;
        }
      }
      kb += "\n";
    }

    kb += "---\n\n";

    return kb;
  }

  private translateType(type: string): string {
    const map: Record<string, string> = {
      CHARACTER: "Personagem",
      LOCATION: "Local",
      EVENT: "Evento",
      OBJECT: "Objeto",
      FACTION: "Facção",
      CONCEPT: "Conceito",
    };
    return map[type] || type;
  }

  /**
   * Formata tipo de relacionamento para exibição legível (Fase 3.4)
   */
  private formatRelationshipType(type: string): string {
    const map: Record<string, string> = {
      FAMILY: "é familiar de",
      FRIENDSHIP: "é amigo de",
      ROMANCE: "tem romance com",
      RIVALRY: "é rival de",
      MENTORSHIP: "é mentor de",
      HIERARCHY: "é superior de",
      ALLIANCE: "é aliado de",
      ENEMY: "é inimigo de",
      OWNERSHIP: "possui",
      RESIDENCE: "reside em",
      MEMBERSHIP: "é membro de",
      PARTICIPATION: "participou de",
      BELIEF: "acredita em",
      AFFILIATION: "é afiliado a",
    };
    return map[type] || type.toLowerCase();
  }

  /**
   * Busca semântica por similaridade de cosseno usando pgvector (Fase 2)
   */
  private async searchBySimilarity(
    storyId: string,
    embedding: number[],
    k: number,
  ): Promise<
    Array<{
      id: number;
      type: string;
      name: string;
      aliases: string[];
      description: string;
      attributes: unknown;
      importance: number;
    }>
  > {
    try {
      // Query usando pgvector
      const results = await prismaClient.$queryRawUnsafe<
        Array<{
          id: number;
          type: string;
          name: string;
          aliases: string[];
          description: string;
          attributes: unknown;
          importance: number;
          distance: number;
        }>
      >(
        `
        SELECT id, type, name, aliases, description, attributes, importance,
               (context_vector::vector <=> $2::vector) as distance
        FROM story_entity
        WHERE story_id = $1::uuid
          AND status = 'ACTIVE'
          AND context_vector IS NOT NULL
        ORDER BY context_vector::vector <=> $2::vector
        LIMIT $3;
      `,
        storyId,
        JSON.stringify(embedding),
        k,
      );

      logger.info(
        {
          resultsFound: results.length,
          avgDistance:
            results.reduce((sum, r) => sum + r.distance, 0) / results.length ||
            0,
        },
        "🎯 Semantic search completed",
      );

      return results.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        aliases: r.aliases,
        description: r.description,
        attributes: r.attributes,
        importance: r.importance,
      }));
    } catch (error) {
      logger.error({ error }, "Semantic search failed, using fallback");

      // Fallback para importância se busca semântica falhar
      return await prismaClient.storyEntity.findMany({
        where: {
          storyId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          type: true,
          name: true,
          aliases: true,
          description: true,
          attributes: true,
          importance: true,
        },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: k,
      });
    }
  }
}
