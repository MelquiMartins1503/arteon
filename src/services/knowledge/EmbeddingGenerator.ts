import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "@/lib/logger";

/**
 * Serviço para geração de embeddings semânticos usando Gemini API
 */
export class EmbeddingGenerator {
  private genAI: GoogleGenerativeAI;
  private readonly MODEL = "text-embedding-004";
  private embeddingCache: Map<string, number[]> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Gera embedding para um texto arbitrário
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);

    if (cached) {
      logger.info({ textLength: text.length }, "✅ Using cached embedding");
      return cached;
    }

    try {
      logger.info(
        { textLength: text.length, model: this.MODEL },
        "🔄 Generating new embedding",
      );

      const model = this.genAI.getGenerativeModel({
        model: this.MODEL,
      });

      const result = await model.embedContent(text);
      const embedding = result.embedding.values;

      // Cachear resultado
      this.embeddingCache.set(cacheKey, embedding);

      // Limpar cache após TTL
      setTimeout(() => {
        this.embeddingCache.delete(cacheKey);
      }, this.CACHE_TTL);

      logger.info(
        { dimensions: embedding.length },
        "✅ Embedding generated successfully",
      );

      return embedding;
    } catch (error) {
      logger.error(
        { error, textLength: text.length },
        "❌ Failed to generate embedding",
      );
      throw error;
    }
  }

  /**
   * Gera embedding específico para uma entidade
   */
  async generateForEntity(entity: {
    name: string;
    description: string;
    type: string;
  }): Promise<number[]> {
    // Formato otimizado: tipo, nome e descrição concatenados
    const text = `${entity.type}: ${entity.name}\n${entity.description}`;
    return this.generateEmbedding(text);
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i] ?? 0;
      const b = vecB[i] ?? 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Gera chave de cache baseada no hash do texto
   */
  private getCacheKey(text: string): string {
    // Hash simples para cache
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `emb_${hash}_${text.length}`;
  }
}
