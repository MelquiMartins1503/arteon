import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { EntityManager } from "./EntityManager";
import type { ExistingEntitySummary } from "./KnowledgeExtractor";
import { KnowledgeExtractor } from "./KnowledgeExtractor";
import { RelationshipManager } from "./RelationshipManager";

/**
 * Estatísticas da reconstrução
 */
export interface RebuildStats {
  deleted: {
    entities: number;
    relationships: number;
    versions: number;
  };
  recreated: {
    entities: number;
    relationships: number;
  };
  messagesProcessed: number;
  duration: number;
}

/**
 * Serviço para reconstruir a knowledge base de uma história
 * ATENÇÃO: Esta operação é DESTRUTIVA e IRREVERSÍVEL
 */
export class KnowledgeRebuilder {
  private extractor: KnowledgeExtractor;
  private entityManager: EntityManager;
  private relationshipManager: RelationshipManager;

  constructor() {
    this.extractor = new KnowledgeExtractor();
    this.entityManager = new EntityManager();
    this.relationshipManager = new RelationshipManager();
  }

  /**
   * Reconstrói completamente a knowledge base de uma história
   */
  async rebuildForStory(storyUuid: string): Promise<RebuildStats> {
    const startTime = Date.now();

    logger.warn(
      { storyUuid },
      "🔥 INICIANDO REBUILD DESTRUTIVO DA KNOWLEDGE BASE",
    );

    // FASE 1: LIMPEZA
    const deletedStats = await this.clearExistingKnowledge(storyUuid);

    // FASE 2: RE-EXTRAÇÃO
    const recreatedStats = await this.reextractFromMessages(storyUuid);

    const duration = Date.now() - startTime;

    const stats: RebuildStats = {
      deleted: deletedStats,
      recreated: {
        entities: recreatedStats.entitiesCreated,
        relationships: recreatedStats.relationshipsCreated,
      },
      messagesProcessed: recreatedStats.messagesProcessed,
      duration,
    };

    logger.info(stats, "✅ Rebuild concluído com sucesso");

    return stats;
  }

  /**
   * FASE 1: Limpa todas as entidades, relacionamentos e versões existentes
   */
  private async clearExistingKnowledge(storyUuid: string): Promise<{
    entities: number;
    relationships: number;
    versions: number;
  }> {
    logger.info({ storyUuid }, "🗑️  FASE 1: Limpando knowledge base...");

    // Buscar story para ter o ID
    const story = await prismaClient.story.findUnique({
      where: { uuid: storyUuid },
      select: { id: true },
    });

    if (!story) {
      throw new Error(`Story not found: ${storyUuid}`);
    }

    // Contar antes de deletar (para estatísticas)
    const [relationshipsCount, versionsCount, entitiesCount] =
      await Promise.all([
        prismaClient.entityRelationship.count({
          where: { storyId: storyUuid },
        }),
        prismaClient.entityVersion.count({
          where: { entity: { storyId: storyUuid } },
        }),
        prismaClient.storyEntity.count({
          where: { storyId: storyUuid },
        }),
      ]);

    logger.warn(
      {
        storyUuid,
        toDelete: {
          entities: entitiesCount,
          relationships: relationshipsCount,
          versions: versionsCount,
        },
      },
      "⚠️  Preparando para deletar...",
    );

    // Deletar em ordem (respeitar foreign keys)
    // 1. Relacionamentos primeiro
    await prismaClient.entityRelationship.deleteMany({
      where: { storyId: storyUuid },
    });
    logger.info({ count: relationshipsCount }, "Relacionamentos deletados");

    // 2. Versões
    await prismaClient.entityVersion.deleteMany({
      where: { entity: { storyId: storyUuid } },
    });
    logger.info({ count: versionsCount }, "Versões deletadas");

    // 3. Entidades por último
    await prismaClient.storyEntity.deleteMany({
      where: { storyId: storyUuid },
    });
    logger.info({ count: entitiesCount }, "Entidades deletadas");

    return {
      entities: entitiesCount,
      relationships: relationshipsCount,
      versions: versionsCount,
    };
  }

  /**
   * FASE 2: Re-extrai conhecimento de todas as mensagens narrativas
   */
  private async reextractFromMessages(storyUuid: string): Promise<{
    entitiesCreated: number;
    relationshipsCreated: number;
    messagesProcessed: number;
  }> {
    logger.info({ storyUuid }, "📖 FASE 2: Re-extraindo de mensagens...");

    // Buscar mensagens narrativas em ordem cronológica
    const messages = await prismaClient.message.findMany({
      where: {
        conversationHistory: {
          story: { uuid: storyUuid },
        },
        messageType: {
          in: ["SECTION_PROPOSAL", "SECTION_CONTENT", "GENERAL"],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        messageType: true,
        createdAt: true,
      },
    });

    logger.info(
      { messagesCount: messages.length },
      "Mensagens narrativas encontradas",
    );

    if (messages.length === 0) {
      logger.warn("Nenhuma mensagem narrativa encontrada para re-extração");
      return {
        entitiesCreated: 0,
        relationshipsCreated: 0,
        messagesProcessed: 0,
      };
    }

    let totalEntitiesCreated = 0;
    let totalRelationshipsCreated = 0;

    // Manter lista de entidades existentes para contexto incremental
    const existingEntities: ExistingEntitySummary[] = [];

    for (const [index, message] of messages.entries()) {
      logger.info(
        {
          messageId: message.id,
          progress: `${index + 1}/${messages.length}`,
          type: message.messageType,
        },
        "Processando mensagem...",
      );

      try {
        // Extrair entidades usando o novo prompt aprimorado
        const extracted = await this.extractor.extractFromContent(
          message.content,
          existingEntities,
          storyUuid,
        );

        // Processar entidades
        const entityResults = await this.entityManager.processExtractedEntities(
          storyUuid,
          extracted.entities,
          message.id,
        );

        totalEntitiesCreated += entityResults.created;

        // Processar relacionamentos
        const relationshipsCreated =
          await this.relationshipManager.processExtractedRelationships(
            storyUuid,
            extracted.relationships,
            message.id,
          );

        totalRelationshipsCreated += relationshipsCreated;

        // Atualizar lista de entidades existentes
        for (const entity of extracted.entities) {
          if (entity.isNew) {
            existingEntities.push({
              name: entity.name,
              type: entity.type,
            });
          }
        }

        logger.info(
          {
            messageId: message.id,
            entitiesCreated: entityResults.created,
            relationshipsCreated,
          },
          "Mensagem processada com sucesso",
        );
      } catch (error) {
        logger.error(
          {
            error,
            messageId: message.id,
            messageType: message.messageType,
          },
          "Erro ao processar mensagem - continuando...",
        );
      }
    }

    return {
      entitiesCreated: totalEntitiesCreated,
      relationshipsCreated: totalRelationshipsCreated,
      messagesProcessed: messages.length,
    };
  }
}
