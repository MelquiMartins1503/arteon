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
   * Processa uma entidade individual com matching inteligente
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

    // CAMADA 1: Busca exata (rápida)
    const exactMatch = await this.findExactMatch(storyId, entity);
    if (exactMatch) {
      logger.info(
        { entityName: entity.name, matchedWith: exactMatch.name },
        "✅ Match exato encontrado",
      );
      return await this.updateEntity(exactMatch.id, entity, messageId);
    }

    // CAMADA 2: Busca parcial (média velocidade)
    const partialMatch = await this.findPartialMatch(storyId, entity);
    if (partialMatch) {
      logger.info(
        {
          entityName: entity.name,
          matchedWith: partialMatch.name,
          reason: "partial_match",
        },
        "🔍 Match parcial encontrado",
      );
      return await this.updateEntity(partialMatch.id, entity, messageId);
    }

    // CAMADA 3: Busca por similaridade (lenta, último recurso)
    const similarMatch = await this.findSimilarMatch(storyId, entity);
    if (similarMatch) {
      logger.info(
        {
          entityName: entity.name,
          matchedWith: similarMatch.name,
          reason: "fuzzy_match",
        },
        "🎯 Match por similaridade encontrado",
      );
      return await this.updateEntity(similarMatch.id, entity, messageId);
    }

    // Nenhum match - criar nova entidade
    logger.info(
      { entityName: entity.name },
      "✨ Nenhuma correspondência encontrada. Criando nova entidade.",
    );
    await this.createEntity(storyId, entity, messageId);
    return "created";
  }

  /**
   * CAMADA 1: Busca exata por nome ou aliases
   */
  private async findExactMatch(
    storyId: string,
    entity: ExtractedEntity,
  ): Promise<{ id: number; name: string } | null> {
    const result = await prismaClient.storyEntity.findFirst({
      where: {
        storyId,
        type: entity.type, // Mesmo tipo
        OR: [
          { name: { equals: entity.name, mode: "insensitive" } },
          { aliases: { hasSome: [entity.name, ...(entity.aliases || [])] } },
        ],
      },
      select: { id: true, name: true },
    });

    return result;
  }

  /**
   * CAMADA 2: Busca parcial (substring)
   */
  private async findPartialMatch(
    storyId: string,
    entity: ExtractedEntity,
  ): Promise<{ id: number; name: string } | null> {
    // Buscar todas entidades do mesmo tipo
    const candidates = await prismaClient.storyEntity.findMany({
      where: {
        storyId,
        type: entity.type,
      },
      select: { id: true, name: true, aliases: true },
    });

    const normalized = this.normalizeForMatching(entity.name);

    for (const candidate of candidates) {
      const candidateNorm = this.normalizeForMatching(candidate.name);

      // Verificar se um nome contém o outro
      if (this.isPartialMatch(normalized, candidateNorm)) {
        return { id: candidate.id, name: candidate.name };
      }

      // Verificar aliases também
      for (const alias of candidate.aliases) {
        const aliasNorm = this.normalizeForMatching(alias);
        if (this.isPartialMatch(normalized, aliasNorm)) {
          return { id: candidate.id, name: candidate.name };
        }
      }
    }

    return null;
  }

  /**
   * CAMADA 3: Busca por similaridade (fuzzy matching)
   */
  private async findSimilarMatch(
    storyId: string,
    entity: ExtractedEntity,
  ): Promise<{ id: number; name: string } | null> {
    // Buscar todas entidades do mesmo tipo
    const candidates = await prismaClient.storyEntity.findMany({
      where: {
        storyId,
        type: entity.type,
      },
      select: { id: true, name: true },
    });

    const SIMILARITY_THRESHOLD = 0.8; // 80% de similaridade
    let bestMatch: { id: number; name: string; similarity: number } | null =
      null;

    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(entity.name, candidate.name);

      if (
        similarity >= SIMILARITY_THRESHOLD &&
        (bestMatch === null || similarity > bestMatch.similarity)
      ) {
        bestMatch = { ...candidate, similarity };
      }
    }

    if (bestMatch) {
      logger.info(
        {
          entityName: entity.name,
          matchedWith: bestMatch.name,
          similarity: bestMatch.similarity,
        },
        "Fuzzy match encontrado",
      );
    }

    return bestMatch ? { id: bestMatch.id, name: bestMatch.name } : null;
  }

  /**
   * Normalização avançada para matching
   */
  private normalizeForMatching(text: string): string {
    return (
      text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        // eslint-disable-next-line no-useless-escape
        .replace(/[^\w\s]/g, " ") // Remove pontuação
        .replace(/\s+/g, " ") // Normaliza espaços
    );
  }

  /**
   * Verifica se há matching parcial entre dois nomes
   */
  private isPartialMatch(norm1: string, norm2: string): boolean {
    // Se um nome contém o outro completamente
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      // Mas não se a diferença for muito grande (evita falsos positivos)
      const ratio =
        Math.min(norm1.length, norm2.length) /
        Math.max(norm1.length, norm2.length);
      return ratio > 0.5; // Pelo menos 50% do tamanho
    }

    return false;
  }

  /**
   * Calcula similaridade entre duas strings usando Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeForMatching(str1);
    const norm2 = this.normalizeForMatching(str2);

    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);

    return 1 - distance / maxLen; // 0-1, onde 1 = idêntico
  }

  /**
   * Algoritmo de Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Inicializar matriz
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }

    // Preencher matriz
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1, // substituição
            matrix[i]![j - 1]! + 1, // inserção
            matrix[i - 1]![j]! + 1, // deleção
          );
        }
      }
    }

    return matrix[str2.length]![str1.length]!;
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
              : ("SYSTEM" as EntitySource),
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
          : ("SYSTEM" as EntitySource),
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
}
