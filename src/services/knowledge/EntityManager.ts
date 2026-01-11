import type {
  ChangeType,
  EntitySource,
  EntityStatus,
  EntityType,
} from "@prisma/client";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
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
  /**
   * Processa lista de entidades extraídas
   */
  async processExtractedEntities(
    storyId: string,
    entities: ExtractedEntity[],
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const entity of entities) {
      try {
        const processed = await this.processEntity(storyId, entity);

        if (processed === "created") result.created++;
        else if (processed === "updated") result.updated++;
        else result.skipped++;
      } catch (error) {
        logger.error(
          { error, entityName: entity.name },
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
      return await this.updateEntity(existing.id, entity);
    } else {
      // Criar nova entidade
      logger.info(
        { entityName: entity.name },
        "✨ Nenhuma correspondência encontrada. Criando nova entidade.",
      );
      await this.createEntity(storyId, entity);
      return "created";
    }
  }

  /**
   * Cria nova entidade
   */
  private async createEntity(
    storyId: string,
    entity: ExtractedEntity,
  ): Promise<void> {
    await prismaClient.storyEntity.create({
      data: {
        storyId,
        type: entity.type as EntityType,
        name: entity.name,
        aliases: entity.aliases || [],
        description: entity.description,
        attributes: entity.attributes || {},
        importance: entity.importance,
        status: "ACTIVE" as EntityStatus,
        createdBy: "AI" as EntitySource,
        // Criar versão inicial
        versions: {
          create: {
            name: entity.name,
            description: entity.description,
            attributes: entity.attributes || {},
            changeType: "CREATED" as ChangeType,
            changeNote: "Entidade criada automaticamente pela IA",
            createdBy: "AI" as EntitySource,
          },
        },
      },
    });

    logger.info({ name: entity.name, type: entity.type }, "Entidade criada");
  }

  /**
   * Atualiza entidade existente
   */
  private async updateEntity(
    entityId: number,
    extracted: ExtractedEntity,
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
        name: current.name,
        description: current.description,
        attributes: current.attributes ?? {},
        changeType: "UPDATED" as ChangeType,
        changeNote: extracted.changes || "Atualização automática",
        createdBy: "AI" as EntitySource,
      },
    });

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
      },
    });

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
