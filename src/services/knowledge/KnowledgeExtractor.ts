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
 * Interface para resumo de entidades existentes
 */
export interface ExistingEntitySummary {
  name: string;
  type: string;
}

/**
 * Resultado da extração
 */
export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

/**
 * Serviço de extração de conhecimento
 * Usa Gemini Flash para identificar entidades importantes em narrativas
 */
export class KnowledgeExtractor {
  private genAI: GoogleGenerativeAI;
  private existingEntitiesCache: Map<string, string> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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
    storyId: string = "default", // NOVO: storyId para cache
  ): Promise<ExtractionResult> {
    try {
      const prompt = this.buildExtractionPrompt(
        content,
        existingEntities,
        storyId,
      );

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
      const extracted: ExtractionResult = JSON.parse(cleaned);

      logger.info(
        {
          extractedCount: extracted.entities.length,
          relationshipsCount: extracted.relationships?.length || 0,
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

      return {
        entities: extracted.entities,
        relationships: extracted.relationships || [],
      };
    } catch (error) {
      logger.error({ error }, "Erro ao extrair entidades");
      return { entities: [], relationships: [] };
    }
  }

  /**
   * Obtém ou constrói resumo de entidades existentes (com cache)
   */
  private getOrBuildExistingEntitiesSummary(
    storyId: string,
    entities: ExistingEntitySummary[],
  ): string {
    const cacheKey = `${storyId}-${entities.length}`;
    const cached = this.existingEntitiesCache.get(cacheKey);

    if (cached) {
      logger.info(
        { storyId, entitiesCount: entities.length },
        "✅ Using cached entities summary",
      );
      return cached;
    }

    logger.info(
      { storyId, entitiesCount: entities.length },
      "🔄 Building new entities summary (cache miss)",
    );
    const summary =
      entities.length > 0
        ? entities.map((e) => `- ${e.name} (${e.type})`).join("\n")
        : "Nenhuma entidade rastreada ainda.";

    this.existingEntitiesCache.set(cacheKey, summary);

    // Limpar cache após TTL
    setTimeout(() => {
      this.existingEntitiesCache.delete(cacheKey);
    }, this.CACHE_TTL);

    return summary;
  }

  /**
   * Constrói o prompt de extração
   */
  /**
   * Extrai entidades de um dossiê completo ou texto estruturado (Bulk Import)
   * Focado em criar uma base de conhecimento inicial a partir de texto livre
   */
  async extractFromDossier(text: string): Promise<ExtractionResult> {
    try {
      const prompt = `
Você é um especialista em estruturar lore e worldbuilding.
Sua tarefa é ler o texto abaixo (que pode ser um dossiê, anotações ou wiki) e extrair TODAS as entidades e relacionamentos importantes para popular um banco de dados de Knowledge Base.

TEXTO DO DOSSIÊ:
"""
${text}
"""

**TIPOS DE ENTIDADES - GUIA COMPLETO:**

USE TODOS OS TIPOS APROPRIADAMENTE. Este é um dossiê completo, então você deve extrair MUITO mais entidades do que em uma conversa normal.

1. **CHARACTER** (Personagem)
   • O QUE: Qualquer pessoa, ser consciente com nome próprio
   • EXEMPLOS: "Klaus Von Mittelsen", "O Narrador", "Dr. Silva", "Anneliese"
   • NÃO USE PARA: Grupos de pessoas (use FACTION)

2. **LOCATION** (Local)
   • O QUE: Lugares físicos específicos com nome próprio
   • EXEMPLOS: "Biblioteca de Memórias", "São Paulo", "Mansão Valendorf"
   • NÃO USE PARA: Conceitos espaciais abstratos (use CONCEPT)

3. **OBJECT** (Objeto)
   • O QUE: Itens físicos importantes, artefatos nomeados
   • EXEMPLOS: "Espada Flamejante", "Diário de Klaus", "Anel de Safira"

4. **EVENT** (Evento)
   • O QUE: Acontecimentos significativos nomeados ou datados
   • EXEMPLOS: "Batalha de 1964", "Primeiro Encontro", "Golpe Militar"

5. **CONCEPT** (Conceito)
   • O QUE: Sistemas, leis, magias, tecnologias, filosofias explicadas
   • EXEMPLOS: "Sistema de Magia Rúnica", "Darwinismo Social", "Protocolo Narrativo"

6. **FACTION** (Facção/Organização)
   • O QUE: Grupos, organizações, ordens, famílias, casas nobres
   • EXEMPLOS: "Casa Von Mittelsen", "SS", "Guilda dos Mercadores"
   • NÃO USE PARA: Pessoas individuais

7. **DECISION** (Decisão)
   • O QUE: Escolhas importantes mencionadas que impactaram a história
   • EXEMPLOS: "Decisão de Klaus de esconder sua verdadeira identidade"
   • USE COM MODERAÇÃO: Apenas para decisões realmente cruciais documentadas

8. **RELATIONSHIP** (Relacionamento)
   • RARAMENTE NECESSÁRIO: Use o campo relationships ao invés
   • QUANDO USAR: Apenas se o relacionamento for um conceito nomeado importante
   • EXEMPLO: "O Pacto de Sangue entre as Casas"

9. **OTHER** (Outro)
   • ÚLTIMO RECURSO: Use apenas se não se encaixar em nenhuma categoria acima

**ÁRVORE DE DECISÃO:**
┌─ É uma pessoa individual? → CHARACTER
├─ É um grupo/família/organização? → FACTION
├─ É um lugar físico? → LOCATION
├─ É um objeto físico? → OBJECT
├─ É um acontecimento histórico? → EVENT
├─ É uma escolha crucial documentada? → DECISION
├─ É um sistema/lei/filosofia abstrata? → CONCEPT
└─ Não encaixa em nada? → OTHER (último recurso)

INSTRUÇÕES:
1. Como é um dossiê, extraia TUDO - seja abundante, não minimalista
2. Identifique Personagens, Locais, Facções, Eventos, Objetos e Conceitos
3. Extraia descrições ricas e detalhadas, não apenas resumos
4. Se houver listas de atributos (idade, classe, etc), inclua no campo 'attributes'
5. Identifique TODOS os relacionamentos mencionados (pai/filho, rival, aliado, localizado em, membro de)
6. Importance: 10 para protagonistas/locais principais, 7-9 para secundários importantes, 4-6 para moderados, 1-3 para passagens
7. O resultado deve ser JSON puro

FORMATO DE RESPOSTA (JSON):
{
  "entities": [
    {
      "type": "CHARACTER" | "LOCATION" | "FACTION" | "EVENT" | "OBJECT" | "CONCEPT" | "DECISION" | "RELATIONSHIP" | "OTHER",
      "name": "Nome da Entidade",
      "description": "Descrição detalhada...",
      "attributes": { "key": "value" },
      "importance": 1-10,
      "aliases": ["Apelido1", "Outro Nome"]
    }
  ],
  "relationships": [
    {
      "fromEntityName": "Nome Origem",
      "toEntityName": "Nome Destino",
      "type": "FAMILY" | "ALLY" | "RIVAL" | "MEMBER" | "LOCATED" | "RELATED",
      "description": "Explicação breve da relação",
      "strength": 1-10
    }
  ]
}
`;

      // Usar Gemini 2.0 Flash para processar grandes volumes rapidamente
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      return JSON.parse(responseText) as ExtractionResult;
    } catch (error) {
      logger.error(
        { error, textPreview: text.substring(0, 100) },
        "Erro ao extrair do dossiê com IA",
      );
      // Fallback: retornar vazio ou tentar parser manual (será tratado no caller)
      return { entities: [], relationships: [] };
    }
  }

  /**
   * Constroi o prompt para extração (método privado existente)
   */
  private buildExtractionPrompt(
    content: string,
    existing: ExistingEntitySummary[],
    storyId: string,
  ): string {
    const existingList = this.getOrBuildExistingEntitiesSummary(
      storyId,
      existing,
    );

    return `
Você é um assistente especializado em identificar informações importantes de narrativas.

Analise este texto narrativo e extraia TODAS as informações relevantes:

${content}

**TIPOS DE ENTIDADES - GUIA COMPLETO:**

USE TODOS OS TIPOS APROPRIADAMENTE. Não se limite apenas a CHARACTER e LOCATION.

1. **CHARACTER** (Personagem)
   • O QUE: Qualquer pessoa, ser consciente com nome próprio
   • EXEMPLOS: "Klaus Von Mittelsen", "O Narrador", "Dr. Silva", "Anneliese"
   • NÃO USE PARA: Grupos de pessoas (use FACTION), menções genéricas sem nome

2. **LOCATION** (Local)
   • O QUE: Lugares físicos específicos com nome próprio
   • EXEMPLOS: "Biblioteca de Memórias", "São Paulo", "Mansão Valendorf", "Santuário de Klaus"
   • NÃO USE PARA: Conceitos espaciais abstratos (use CONCEPT)

3. **OBJECT** (Objeto)
   • O QUE: Itens físicos importantes, artefatos nomeados ou significativos
   • EXEMPLOS: "Espada Flamejante", "Diário de Klaus", "Anel de Safira", "Relíquia Familiar"
   • NÃO USE PARA: Conceitos abstratos (use CONCEPT) ou locais (use LOCATION)

4. **EVENT** (Evento)
   • O QUE: Acontecimentos significativos nomeados, datados ou históricos
   • EXEMPLOS: "Batalha de 1964", "Primeiro Encontro", "Golpe Militar", "Inauguração da Biblioteca"
   • NÃO USE PARA: Decisões de personagens (use DECISION)

5. **CONCEPT** (Conceito)
   • O QUE: Sistemas, leis, magias, tecnologias, filosofias, ideias abstratas explicadas
   • EXEMPLOS: "Sistema de Magia Rúnica", "Lei da Conservação", "Darwinismo Social", "Protocolo Narrativo"
   • NÃO USE PARA: Objetos físicos, pessoas, ou organizações

6. **FACTION** (Facção/Organização)
   • O QUE: Grupos, organizações, ordens, famílias, casas nobres nomeadas
   • EXEMPLOS: "Casa Von Mittelsen", "SS", "Guilda dos Mercadores", "Família Valendorf"
   • NÃO USE PARA: Pessoas individuais (use CHARACTER)

7. **DECISION** (Decisão)
   • O QUE: Escolhas importantes tomadas por personagens que impactam significativamente a trama
   • EXEMPLOS: "Klaus decide revelar seu passado", "Decisão de ir à guerra", "Escolha de abandonar a família"
   • QUANDO USAR: Apenas se for uma escolha explícita e importante mencionada no texto
   • NÃO USE PARA: Eventos que simplesmente acontecem (use EVENT)

8. **RELATIONSHIP** (Relacionamento)
   • O QUE: Raramente usado como entidade - prefira usar o sistema de relationships
   • QUANDO USAR: Apenas se o relacionamento em si for um conceito importante nomeado
   • EXEMPLO: "O Pacto de Sangue entre as Casas", "A Aliança Eterna"
   • NÃO USE PARA: Relacionamentos normais entre pessoas (use o campo relationships)

9. **OTHER** (Outro)
   • O QUE: Informações relevantes que não se encaixam em NENHUMA categoria acima
   • QUANDO USAR: Como ÚLTIMO RECURSO. Tente sempre usar um dos tipos específicos
   • EVITE: Usar OTHER por preguiça de classificar corretamente

**ÁRVORE DE DECISÃO RÁPIDA:**
┌─ É uma pessoa/ser consciente individual? → CHARACTER
├─ É um grupo/organização/família? → FACTION
├─ É um lugar físico nomeado? → LOCATION
├─ É um objeto físico importante? → OBJECT
├─ É um acontecimento/batalha/evento histórico? → EVENT
├─ É uma escolha importante de personagem? → DECISION
├─ É um sistema/lei/magia/filosofia abstrata? → CONCEPT
├─ É um relacionamento nomeado importante? → RELATIONSHIP (raro)
└─ Não se encaixa em nada acima? → OTHER (último recurso)

**ENTIDADES JÁ RASTREADAS:**
${existingList}

**REGRAS CRÍTICAS:**
- Se uma entidade acima for mencionada novamente, marque isNew: false
- Extraia APENAS informações NOVAS ou ATUALIZADAS
- Seja DETALHADO nas descrições (2-4 frases completas)
- Atribua importance de 1-10:
  * 10 = crucial para a trama (protagonista, local principal)
  * 7-9 = muito importante (personagens secundários chave, facções principais)
  * 4-6 = moderadamente importante
  * 1-3 = menção de passagem
- Se isNew: false, indique em "changes" O QUE mudou exatamente

**RELACIONAMENTOS:**
Identifique também relacionamentos explícitos entre entidades. Use tipos:
- FAMILY (pai, mãe, irmão, filho)
- FRIENDSHIP (amizade)
- ROMANCE (amor, relacionamento romântico)
- RIVALRY (rivalidade, competição)
- MENTORSHIP (mentor/aprendiz)
- HIERARCHY (chefe/subordinado)
- ALLIANCE (aliança estratégica)
- ENEMY (inimigo declarado)
- OWNERSHIP (possui objeto)
- RESIDENCE (mora em local)
- MEMBERSHIP (membro de facção)
- PARTICIPATION (participou de evento)
- BELIEF (acredita em conceito)
- AFFILIATION (afiliação geral)

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
  ],
  "relationships": [
    {
      "fromEntityName": "Nome Exato Origem",
      "toEntityName": "Nome Exato Destino",
      "type": "FRIENDSHIP",
      "description": "Descrição do relacionamento",
      "strength": 7
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
