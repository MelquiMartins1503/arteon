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
  /**
   * Extrai entidades de um dossiê completo ou texto estruturado (Bulk Import)
   * Focado em criar uma base de conhecimento inicial a partir de texto livre
   * Suporta textos grandes dividindo em chunks
   */
  async extractFromDossier(text: string): Promise<ExtractionResult> {
    const CHUNK_SIZE = 12000; // Reduzido para ~3k tokens para garantir espaço de output
    const chunks = this.splitTextIntoChunks(text, CHUNK_SIZE);

    if (chunks.length > 1) {
      logger.info(
        {
          totalLength: text.length,
          chunksCount: chunks.length,
          chunkSize: CHUNK_SIZE,
        },
        "📜 Texto grande detectado. Usando estratégia de Chunking com Contexto.",
      );
    }

    const combinedResult: ExtractionResult = {
      entities: [],
      relationships: [],
    };

    // Manter lista de nomes já extraídos para informar o próximo chunk
    const extractedNames = new Set<string>();

    for (const [index, chunk] of chunks.entries()) {
      try {
        if (chunks.length > 1) {
          logger.info(
            { chunk: index + 1, total: chunks.length },
            "⏳ Processando chunk...",
          );
        }

        const contextInfo =
          index > 0
            ? `\n📋 **ENTIDADES DOS CHUNKS ANTERIORES (apenas para referência de nomes - NÃO significa que você deve ignorá-las se aparecerem aqui):**\n${Array.from(extractedNames).slice(0, 50).join(", ")}${extractedNames.size > 50 ? "..." : ""}\n`
            : "";

        const prompt = `
Você é um especialista em estruturar lore e worldbuilding para uma BASE DE CONHECIMENTO DE REFERÊNCIA.

# ⚠️ REGRAS CRÍTICAS DE NOMENCLATURA (OBRIGATÓRIO)

**PARA ENTIDADES DO TIPO CHARACTER:**
- SEMPRE use o nome COMPLETO (Nome + Sobrenome/Título)
- NUNCA use apenas o primeiro nome no campo "name"
- Mínimo de 2 palavras para personagens

**Exemplos CORRETOS:**
✅ "Klaus Von Mittelsen"
✅ "Anneliese Von Steinberg"
✅ "Isolde Von Adler"
✅ "Wolfgang Von Mittelsen"

**Exemplos PROIBIDOS:**
❌ "Klaus"
❌ "Anneliese"
❌ "Isolde"

➡️ Se você encontrar menções usando apenas o primeiro nome, DEVE inferir o sobrenome completo baseado no contexto.
➡️ O nome curto vai para o campo "aliases", NÃO para "name".

Exemplo correto:
{
  "type": "CHARACTER",
  "name": "Klaus Von Mittelsen",  // ✅ Nome completo
  "aliases": ["Klaus", "O Príncipe Guerreiro"],  // ✅ Nome curto como alias
  ...
}

# 📌 CRITÉRIOS DE RELEVÂNCIA (OBRIGATÓRIO)

Esta é uma BASE DE CONHECIMENTO DE REFERÊNCIA. Mensagens narrativas já são carregadas separadamente.

**✅ DEVE EXTRAIR (Permanente e Estrutural):**
- Características físicas PERMANENTES (cor dos olhos, altura, traços)
- Personalidade NUCLEAR (traços que não mudam)
- Cargos/posições FORMAIS (ex: "Futuro Führer", "Comandante")
- Data de nascimento
- Relacionamentos ESTRUTURAIS (família, hierarquia formal, romance estabelecido)
- Locais geográficos e suas descrições permanentes
- Conceitos fundamentais do universo narrativo

**❌ NÃO DEVE EXTRAIR (Temporário ou Redundante com Mensagens):**
- Eventos narrativos específicos (ex: "Klaus foi à reunião no dia X")
- Estados emocionais temporários (ex: "Klaus está preocupado")
- Diálogos ou pensamentos (ex: "Klaus disse: 'Vamos em frente'")
- Descrições de cenas (ex: "O escritório estava escuro")
- Ações pontuais (ex: "Klaus caminhou até a porta")
- Conflitos temporários (ex: "Klaus desconfia de Isolde no momento")

**🧪 TESTE DE RELEVÂNCIA:**
Pergunte: "Esta informação ainda será verdadeira daqui a 10 capítulos?"
- Se SIM → Extrair
- Se NÃO → Ignorar

---

🎯 MISSÃO: EXTRAIA **APENAS** AS ENTIDADES RELEVANTES E PERMANENTES NESTE TRECHO.
Este é o chunk ${index + 1} de ${chunks.length}.

TEXTO DO DOSSIÊ (PARTE ${index + 1}):
"""
${chunk}
"""
${contextInfo}

**TIPOS DE ENTIDADES:**
- **CHARACTER** (Personagem): Pessoas, seres conscientes - SEMPRE COM NOME COMPLETO
- **LOCATION** (Local): Lugares físicos nomeados
- **OBJECT** (Objeto): Itens importantes, artefatos
- **CONCEPT** (Conceito): Sistemas, leis, magias, filosofias
- **FACTION** (Facção): Grupos, organizações, famílias
- **EVENT** (Evento): ⚠️ USE COM CAUTELA - apenas eventos históricos fundamentais, NÃO eventos narrativos pontuais
- **DECISION** (Decisão): ⚠️ RARAMENTE USADO - apenas decisões que definem características permanentes

**TIPOS DE RELACIONAMENTOS VÁLIDOS (APENAS ESTRUTURAIS):**
- **FAMILY** - Família (pai, mãe, irmão, filho, cônjuge)
- **HIERARCHY** - Superior/subordinado formal
- **ROMANCE** - Romance ESTABELECIDO (não crush temporário)
- **ENEMY** - Inimizade FORMAL (não desentendimento pontual)
- **MEMBERSHIP** - Membro de facção/organização
- **OWNERSHIP** - Posse (CHARACTER → OBJECT)
- **RESIDENCE** - Moradia permanente (CHARACTER → LOCATION)
- **BELIEF** - Acredita em conceito fundamental

⚠️ NÃO CRIE relacionamentos para: amizades casuais, rivalidades temporárias, alianças pontuais

**FORMATO JSON (APENAS JSON, SEM COMENTÁRIOS):**
{
  "entities": [
    {
      "type": "CHARACTER|LOCATION|OBJECT|CONCEPT|FACTION",
      "name": "Nome Completo Obrigatório para CHARACTER",
      "description": "Descrição PERMANENTE e ESTRUTURAL (3-5 frases)",
      "attributes": {
        "chave": "valor"
      },
      "importance": 1-10,
      "aliases": ["Variante1", "Título1"]
    }
  ],
  "relationships": [
    {
      "fromEntityName": "Nome Exato Completo",
      "toEntityName": "Nome Exato Completo",
      "type": "FAMILY|HIERARCHY|ROMANCE|ENEMY|MEMBERSHIP|OWNERSHIP|RESIDENCE|BELIEF",
      "description": "Descrição da relação PERMANENTE",
      "strength": 1-10
    }
  ]
}

🎯 LEMBRE-SE: 
- Nomes COMPLETOS para personagens
- APENAS informações permanentes e estruturais
- Descrições com mínimo de 50 caracteres
`;

        // Usar Gemini 2.0 Flash
        const model = this.genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleaned = this.cleanJsonResponse(responseText);
        const parsed: ExtractionResult = JSON.parse(cleaned);

        // Merge results
        if (parsed.entities) {
          for (const entity of parsed.entities) {
            combinedResult.entities.push(entity);
            extractedNames.add(entity.name);
          }
        }
        if (parsed.relationships) {
          combinedResult.relationships.push(...parsed.relationships);
        }
      } catch (error) {
        logger.error(
          { error, chunkIndex: index },
          "Erro ao extrair chunk do dossiê com IA",
        );
      }
    }

    if (chunks.length > 1) {
      logger.info(
        {
          totalEntities: combinedResult.entities.length,
          uniqueNames: extractedNames.size,
        },
        "✅ Extração em chunks concluída",
      );
    }

    return combinedResult;
  }

  /**
   * Divide o texto em chunks respeitando quebras de parágrafo
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = "";

    // Tenta dividir por parágrafos duplos primeiro
    const paragraphs = text.split(/\n\s*\n/);

    for (const paragraph of paragraphs) {
      // Se o parágrafo sozinho é maior que o chunk (caso raro mas possível),
      // divide por sentenças ou arbitrariamente
      if (paragraph.length > maxChunkSize) {
        // Se já tinha algo no buffer, salva
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }

        // Divide o parágrafo gigante
        let remaining = paragraph;
        while (remaining.length > 0) {
          const take = Math.min(remaining.length, maxChunkSize);
          chunks.push(remaining.substring(0, take));
          remaining = remaining.substring(take);
        }
        continue;
      }

      // Se adicionar o próximo parágrafo estoura o limite, salva o chunk atual
      if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        if (currentChunk) {
          currentChunk += `\n\n${paragraph}`;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
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
# ⚠️ REGRAS CRÍTICAS DE NOMENCLATURA

**PERSONAGENS (CHARACTER):**
- SEMPRE nome COMPLETO: "Klaus Von Mittelsen", não "Klaus"
- Nome curto vai para "aliases": ["Klaus"]
- Mínimo: 2 palavras

# 📌 CRITÉRIOS DE RELEVÂNCIA

BASE DE CONHECIMENTO = informações PERMANENTES
Mensagens narrativas = já carregadas no contexto

**✅ EXTRAIR:**
- Características permanentes (aparência fixa, personalidade nuclear)
- Cargos formais, datas de nascimento
- Relacionamentos estruturais (família, hierarquia)

**❌ NÃO EXTRAIR:**
- Eventos pontuais, estados temporários, diálogos, ações, cenas

**TESTE:** "Será verdade daqui a 10 capítulos?" → SIM = extrair, NÃO = ignorar

---

Você é um assistente especializado em identificar informações importantes de narrativas.

Analise este texto narrativo e extraia APENAS informações PERMANENTES e RELEVANTES:

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
