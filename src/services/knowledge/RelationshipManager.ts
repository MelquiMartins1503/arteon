import type { EntitySource, RelationshipType } from "@prisma/client";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";

/**
 * Interface para relacionamento extraído
 */
export interface ExtractedRelationship {
  fromEntityName: string;
  toEntityName: string;
  type: string;
  description: string;
  strength?: number; // 1-10
}

/**
 * Gerenciador de relacionamentos entre entidades
 * Responsável por criar, atualizar e consultar o grafo de relacionamentos
 */
export class RelationshipManager {
  /**
   * Processa e salva relacionamentos extraídos
   */
  async processExtractedRelationships(
    storyId: string,
    relationships: ExtractedRelationship[],
    messageId?: number,
  ): Promise<number> {
    let created = 0;

    for (const rel of relationships) {
      try {
        // Buscar IDs das entidades pelo nome
        const [fromEntity, toEntity] = await Promise.all([
          prismaClient.storyEntity.findFirst({
            where: {
              storyId,
              name: rel.fromEntityName,
              status: "ACTIVE",
            },
            select: { id: true },
          }),
          prismaClient.storyEntity.findFirst({
            where: {
              storyId,
              name: rel.toEntityName,
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ]);

        if (!fromEntity || !toEntity) {
          logger.warn(
            {
              from: rel.fromEntityName,
              to: rel.toEntityName,
              foundFrom: !!fromEntity,
              foundTo: !!toEntity,
            },
            "⚠️ Relationship entities not found - skipping",
          );
          continue;
        }

        // Criar ou atualizar relacionamento
        await this.upsertRelationship(
          storyId,
          fromEntity.id,
          toEntity.id,
          rel.type as RelationshipType,
          rel.description,
          rel.strength || 5,
          messageId,
        );

        created++;

        logger.info(
          {
            from: rel.fromEntityName,
            to: rel.toEntityName,
            type: rel.type,
          },
          "🔗 Relationship created/updated",
        );
      } catch (error) {
        logger.error(
          { error, relationship: rel },
          "Error processing relationship",
        );
      }
    }

    return created;
  }

  /**
   * Cria ou atualiza um relacionamento
   */
  private async upsertRelationship(
    storyId: string,
    fromEntityId: number,
    toEntityId: number,
    type: RelationshipType,
    description: string,
    strength: number,
    messageId?: number,
  ): Promise<void> {
    await prismaClient.entityRelationship.upsert({
      where: {
        fromEntityId_toEntityId_type: {
          fromEntityId,
          toEntityId,
          type,
        },
      },
      create: {
        storyId,
        fromEntityId,
        toEntityId,
        type,
        description,
        strength,
        createdBy: "AI" as EntitySource,
        messageId,
      },
      update: {
        description,
        strength: Math.max(strength, 5), // Nunca reduzir força abaixo de 5
        messageId, // Atualizar rastreabilidade
      },
    });
  }

  /**
   * Busca relacionamentos de uma entidade
   */
  async getEntityRelationships(
    entityId: number,
    options?: {
      includeIncoming?: boolean;
      includeOutgoing?: boolean;
      types?: RelationshipType[];
    },
  ) {
    const {
      includeIncoming = true,
      includeOutgoing = true,
      types,
    } = options || {};

    const where: { type?: { in: RelationshipType[] } } = {};
    if (types && types.length > 0) {
      where.type = { in: types };
    }

    const [outgoing, incoming] = await Promise.all([
      includeOutgoing
        ? prismaClient.entityRelationship.findMany({
            where: { ...where, fromEntityId: entityId },
            include: {
              toEntity: {
                select: { id: true, name: true, type: true },
              },
            },
          })
        : [],
      includeIncoming
        ? prismaClient.entityRelationship.findMany({
            where: { ...where, toEntityId: entityId },
            include: {
              fromEntity: {
                select: { id: true, name: true, type: true },
              },
            },
          })
        : [],
    ]);

    return { outgoing, incoming };
  }

  /**
   * Expande busca semântica incluindo entidades relacionadas
   */
  async expandWithRelationships(
    entityIds: number[],
    maxExpansion: number = 10,
  ): Promise<Set<number>> {
    const expanded = new Set<number>(entityIds);
    const toProcess = [...entityIds];

    while (toProcess.length > 0 && expanded.size < maxExpansion) {
      const currentId = toProcess.shift();
      if (!currentId) break;

      const { outgoing, incoming } = await this.getEntityRelationships(
        currentId,
        {
          includeIncoming: true,
          includeOutgoing: true,
        },
      );

      // Adicionar entidades relacionadas com maior força
      const strongRelationships = [
        ...outgoing.filter((r) => r.strength >= 7).map((r) => r.toEntity.id),
        ...incoming.filter((r) => r.strength >= 7).map((r) => r.fromEntity.id),
      ];

      for (const relatedId of strongRelationships) {
        if (!expanded.has(relatedId) && expanded.size < maxExpansion) {
          expanded.add(relatedId);
        }
      }
    }

    return expanded;
  }
}
