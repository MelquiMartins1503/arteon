import type { ChangeType, EntitySource } from "@prisma/client";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { EmbeddingGenerator } from "./EmbeddingGenerator";
import type { ExtractedEntity } from "./KnowledgeExtractor";

/**
 * Resultado do processamento
 */
export interface ProcessResult {
  created: number;
  updated: number;
  skipped: number;
}

/**
 * Gerenciador de entidades da base de conhecimento
 * Responsável por criar, atualizar e gerenciar entidades
 */
export class EntityManager {
  private embeddingGen: EmbeddingGenerator;

  constructor() {
    this.embeddingGen = new EmbeddingGenerator();
  }

  /**
   * Processa lista de entidades extraídas
   */
  async processExtractedEntities(
    storyId: string,
    entities: ExtractedEntity[],
    messageId?: number,
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const entity of entities) {
      try {
        const processed = await this.processEntity(storyId, entity, messageId);

        if (processed === "created") result.created++;
        else if (processed === "updated") result.updated++;
        else result.skipped++;
      } catch (error) {
        logger.error(
          {
            error,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            entityName: entity.name,
            entityType: entity.type,
            entityData: entity,
          },
          "Erro ao processar entidade",
        );
        result.skipped++;
      }
    }

    logger.info(result, "Processamento de entidades concluído");
    return result;
  }

  /**
   * Processa uma entidade individual
   */
  private async processEntity(
    storyId: string,
    entity: ExtractedEntity,
    messageId?: number,
  ): Promise<"created" | "updated" | "skipped"> {
    logger.info(
      { entityName: entity.name, type: entity.type },
      "🔍 Processando entidade...",
    );

    // Normalizar nome para busca
    const _normalizedName = this.normalizeName(entity.name);

    // Buscar entidade existente
    const existing = await prismaClient.storyEntity.findFirst({
      where: {
        storyId,
        OR: [
          { name: { equals: entity.name, mode: "insensitive" } },
          { aliases: { hasSome: [entity.name, ...(entity.aliases || [])] } },
        ],
      },
    });

    if (existing) {
      // Atualizar entidade existente
      return await this.updateEntity(existing.id, entity, messageId);
    } else {
      // Criar nova entidade
      logger.info(
        { entityName: entity.name },
        "✨ Nenhuma correspondência encontrada. Criando nova entidade.",
      );
      await this.createEntity(storyId, entity, messageId);
      return "created";
    }
  }

  /**
   * Cria nova entidade
   */
  private async createEntity(
    storyId: string,
    entity: ExtractedEntity,
    messageId?: number,
  ): Promise<void> {
    logger.info(
      { name: entity.name, type: entity.type },
      "📝 Creating new entity",
    );

    // Gerar embedding semântico
    const embedding = await this.embeddingGen.generateForEntity(entity);

    // Log de debug
    logger.info(
      {
        entity: {
          type: entity.type,
          name: entity.name,
          aliases: entity.aliases,
          importance: entity.importance,
          isNew: entity.isNew,
        },
        hasMessageId: !!messageId,
      },
      "🔍 Creating entity with data",
    );

    const createdEntity = await prismaClient.storyEntity.create({
      data: {
        storyId,
        type: entity.type,
        name: entity.name,
        aliases: entity.aliases || [],
        description: entity.description,
        attributes: entity.attributes || {},
        importance: entity.importance || 5,
        // contextVector removido aqui pois é Unsupported("vector")
        versions: {
          create: {
            name: entity.name,
            description: entity.description,
            attributes: entity.attributes || {},
            changeType: "CREATED" as ChangeType,
            changeNote: messageId
              ? "Entidade criada automaticamente pela IA"
              : "Entidade criada manualmente via KB Import",
            createdBy: messageId
              ? ("AI" as EntitySource)
              : ("USER" as EntitySource),
            ...(messageId && { messageId }),
          },
        },
        ...(messageId && { messageId }),
      },
    });

    // Atualizar vetor separadamente via Raw SQL para suportar tipo Vector
    if (embedding && embedding.length > 0) {
      await prismaClient.$executeRawUnsafe(
        `UPDATE "story_entity" SET context_vector = $2::vector WHERE id = $1`,
        createdEntity.id,
        JSON.stringify(embedding),
      );
    }

    logger.info({ name: entity.name, type: entity.type }, "Entidade criada");
  }

  /**
   * Atualiza entidade existente
   */
  private async updateEntity(
    entityId: number,
    extracted: ExtractedEntity,
    messageId?: number,
  ): Promise<"updated" | "skipped"> {
    // Buscar entidade atual
    const current = await prismaClient.storyEntity.findUnique({
      where: { id: entityId },
    });

    if (!current) return "skipped";

    // Verificar se houve mudanças relevantes
    const hasChanges =
      extracted.description !== current.description ||
      JSON.stringify(extracted.attributes) !==
        JSON.stringify(current.attributes);

    if (!hasChanges) {
      // Sem mudanças, apenas adicionar aliases se houver novos
      const newAliases = (extracted.aliases || []).filter(
        (a) => !current.aliases.includes(a),
      );

      if (newAliases.length > 0) {
        logger.info(
          { entityName: current.name, newAliases },
          "📎 Sem mudanças de conteúdo, apenas novos aliases adicionados.",
        );
        await prismaClient.storyEntity.update({
          where: { id: entityId },
          data: {
            aliases: [...current.aliases, ...newAliases],
          },
        });
        return "updated";
      }

      logger.info(
        { entityName: current.name },
        "zzz Entidade idêntica à existente. Ignorando (SKIP).",
      );
      return "skipped";
    }

    logger.info(
      {
        entityName: current.name,
        changes: extracted.changes,
        diff: {
          desc: extracted.description !== current.description,
          attrs:
            JSON.stringify(extracted.attributes) !==
            JSON.stringify(current.attributes),
        },
      },
      "📝 Mudanças detectadas! Atualizando entidade e criando versão.",
    );

    // Criar versão para histórico
    await prismaClient.entityVersion.create({
      data: {
        entityId,
        name: extracted.name,
        description: extracted.description,
        attributes: extracted.attributes || {},
        changeType: "UPDATED" as ChangeType,
        changeNote: extracted.changes || "Atualização automática",
        createdBy: messageId
          ? ("AI" as EntitySource)
          : ("USER" as EntitySource),
        ...(messageId && { messageId }),
      },
    });

    // Regenerar embedding se descrição mudou
    let newEmbedding: number[] | undefined;
    if (extracted.description !== current.description) {
      logger.info(
        { entityName: current.name },
        "🔄 Description changed - regenerating embedding",
      );
      newEmbedding = await this.embeddingGen.generateForEntity({
        name: extracted.name,
        description: extracted.description,
        type: extracted.type,
      });
    }

    // Atualizar entidade
    await prismaClient.storyEntity.update({
      where: { id: entityId },
      data: {
        description: extracted.description,
        attributes: extracted.attributes || {},
        importance: Math.max(current.importance, extracted.importance),
        aliases: [
          ...new Set([...current.aliases, ...(extracted.aliases || [])]),
        ],
        // contextVector removido daqui
      },
    });

    // Atualizar vetor se necessário
    if (newEmbedding && newEmbedding.length > 0) {
      await prismaClient.$executeRawUnsafe(
        `UPDATE "story_entity" SET context_vector = $2::vector WHERE id = $1`,
        entityId,
        JSON.stringify(newEmbedding),
      );
    }

    logger.info(
      { name: current.name, changes: extracted.changes },
      "Entidade atualizada",
    );

    return "updated";
  }

  /**
   * Normaliza nome para comparação
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
}
