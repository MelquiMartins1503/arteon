import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "@/lib/logger";

/**
 * Tipo de entidade extraída
 */
export type EntityType =
  | "CHARACTER"
  | "LOCATION"
  | "OBJECT"
  | "EVENT"
  | "CONCEPT"
  | "FACTION"
  | "DECISION"
  | "RELATIONSHIP"
  | "OTHER";

/**
 * Entidade extraída pela IA
 */
export interface ExtractedEntity {
  type: EntityType;
  name: string;
  aliases?: string[];
  description: string;
  attributes?: Record<string, unknown>;
  importance: number; // 1-10
  isNew: boolean; // true = nova, false = atualização
  changes?: string; // O que mudou (se isNew = false)
}

/**
 * Resposta da extração
 */
interface ExtractionResponse {
  entities: ExtractedEntity[];
}

/**
 * Entidade existente (resumida)
 */
interface ExistingEntitySummary {
  name: string;
  type: EntityType;
}

/**
 * Serviço de extração de conhecimento
 * Usa Gemini Flash para identificar entidades importantes em narrativas
 */
export class KnowledgeExtractor {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Extrai entidades de um conteúdo narrativo
   */
  async extractFromContent(
    content: string,
    existingEntities: ExistingEntitySummary[] = [],
  ): Promise<ExtractedEntity[]> {
    try {
      const prompt = this.buildExtractionPrompt(content, existingEntities);

      // Usar Gemini 2.0 Flash (rápido e barato)
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      logger.info(
        {
          contentLength: content.length,
          promptSize: prompt.length,
          responseSize: responseText.length,
        },
        "🤖 Gemini completou a extração. Processando resposta...",
      );

      // Parse JSON
      const cleaned = this.cleanJsonResponse(responseText);
      const extracted: ExtractionResponse = JSON.parse(cleaned);

      logger.info(
        {
          extractedCount: extracted.entities.length,
          newCount: extracted.entities.filter((e) => e.isNew).length,
          updatedCount: extracted.entities.filter((e) => !e.isNew).length,
        },
        "Entidades extraídas com sucesso",
      );

      extracted.entities.forEach((e) => {
        logger.info(
          {
            name: e.name,
            type: e.type,
            isNew: e.isNew,
            importance: e.importance,
          },
          `🔎 Entidade identificada: ${e.name} (${e.type})`,
        );
      });

      return extracted.entities;
    } catch (error) {
      logger.error({ error }, "Erro ao extrair entidades");
      return []; // Retorna vazio em caso de erro (não bloqueia fluxo)
    }
  }

  /**
   * Constrói o prompt de extração
   */
  private buildExtractionPrompt(
    content: string,
    existing: ExistingEntitySummary[],
  ): string {
    const existingList =
      existing.length > 0
        ? existing.map((e) => `- ${e.name} (${e.type})`).join("\n")
        : "Nenhuma entidade rastreada ainda.";

    return `
Você é um assistente especializado em identificar informações importantes de narrativas.

Analise este texto narrativo e extraia TODAS as informações relevantes:

${content}

**CATEGORIAS (extraia TUDO que se encaixar):**

1. **CHARACTER:** Qualquer pessoa com nome próprio
2. **LOCATION:** Lugares específicos (cidades, prédios, regiões)
3. **OBJECT:** Itens importantes mencionados
4. **EVENT:** Acontecimentos significativos (passados ou presentes)
5. **CONCEPT:** Sistemas, leis, magias, tecnologias explicadas
6. **FACTION:** Organizações, grupos, ordens mencionadas
7. **DECISION:** Escolhas importantes de personagens
8. **RELATIONSHIP:** Vínculos explícitos entre entidades

**ENTIDADES JÁ RASTREADAS:**
${existingList}

**REGRAS CRÍTICAS:**
- Se uma entidade acima for mencionada novamente, marque isNew: false
- Extraia APENAS informações NOVAS ou ATUALIZADAS
- Seja DETALHADO nas descrições (2-4 frases)
- Atribua importance de 1-10:
  * 10 = crucial para a trama (protagonista, local principal)
  * 7-9 = muito importante (personagens secundários chave)
  * 4-6 = moderadamente importante
  * 1-3 = menção de passagem
- Se isNew: false, indique em "changes" O QUE mudou

**FORMATO JSON (APENAS JSON, SEM TEXTO ADICIONAL):**
{
  "entities": [
    {
      "type": "CHARACTER",
      "name": "Nome Completo Exato",
      "aliases": ["Apelido1", "Apelido2"],
      "description": "Descrição detalhada em 2-4 frases completas.",
      "attributes": {
        "appearance": "descrição física",
        "abilities": "habilidades",
        "role": "papel na história"
      },
      "importance": 8,
      "isNew": true,
      "changes": "Apenas se isNew: false"
    }
  ]
}

Retorne APENAS o JSON válido.
`;
  }

  /**
   * Limpa a resposta JSON removendo markdown
   */
  private cleanJsonResponse(text: string): string {
    // Remove blocos de código markdown
    let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Remove espaços em branco extras
    cleaned = cleaned.trim();

    return cleaned;
  }
}
