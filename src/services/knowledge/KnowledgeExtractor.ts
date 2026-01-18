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

🎯 MISSÃO CRÍTICA: EXTRAIA ABSOLUTAMENTE TUDO deste dossiê. Seja ABUNDANTE, não minimalista.
Prefira extrair DEMAIS do que de menos. Este é um documento completo de worldbuilding.

TEXTO DO DOSSIÊ:
"""
${text}
"""

⚠️ REGRAS DE COMPLETUDE:
✅ Extraia TODAS as entidades mencionadas, mesmo que brevemente
✅ Descrições: Mínimo 3-5 frases para entidades principais, 2-3 para secundárias
✅ Atributos: Capture TODOS os detalhes mencionados (idade, aparência, classe, poderes, origem, etc)
✅ Aliases: Todos os nomes alternativos, apelidos, títulos
✅ Relacionamentos: Identifique TODOS, mesmo os implícitos
❌ NÃO omita informações por considerá-las "menores"
❌ NÃO resuma excessivamente - seja detalhado

**TIPOS DE ENTIDADES:**

1. **CHARACTER** (Personagem)
   • O QUE: Qualquer pessoa, ser consciente com nome próprio
   • EXEMPLOS: "Klaus Von Mittelsen", "O Narrador", "Dr. Silva", "Anneliese"
   • DESCRIÇÃO: Inclua aparência, personalidade, história, motivações, poderes (se houver)
   • ATTRIBUTES: idade, classe, profissão, habilidades, aparência física
   • NÃO USE PARA: Grupos de pessoas (use FACTION)

2. **LOCATION** (Local)
   • O QUE: Lugares físicos específicos com nome próprio
   • EXEMPLOS: "Biblioteca de Memórias", "São Paulo", "Mansão Valendorf", "Sala Secreta"
   • DESCRIÇÃO: Inclua aparência, atmosfera, história, importância
   • ATTRIBUTES: tamanho, tipo, região, características especiais
   • NÃO USE PARA: Conceitos espaciais abstratos (use CONCEPT)

3. **OBJECT** (Objeto)
   • O QUE: Itens físicos importantes, artefatos nomeados
   • EXEMPLOS: "Espada Flamejante", "Diário de Klaus", "Anel de Safira"
   • DESCRIÇÃO: Aparência, poderes/propriedades, história, significado
   • ATTRIBUTES: material, poderes, origem, condição

4. **EVENT** (Evento)
   • O QUE: Acontecimentos significativos nomeados ou datados
   • EXEMPLOS: "Batalha de 1964", "Primeiro Encontro", "Golpe Militar"
   • DESCRIÇÃO: O que aconteceu, quando, onde, quem participou, consequências
   • ATTRIBUTES: data, local, participantes, resultado

5. **CONCEPT** (Conceito)
   • O QUE: Sistemas, leis, magias, tecnologias, filosofias, ideologias
   • EXEMPLOS: "Sistema de Magia Rúnica", "Darwinismo Social", "Protocolo Narrativo"
   • DESCRIÇÃO: Como funciona, regras, origem, importância
   • ATTRIBUTES: tipo, regras, limitações

6. **FACTION** (Facção/Organização)
   • O QUE: Grupos, organizações, ordens, famílias, casas nobres
   • EXEMPLOS: "Casa Von Mittelsen", "SS", "Guilda dos Mercadores", "Conselho dos Anciões"
   • DESCRIÇÃO: Propósito, história, estrutura, influência, membros notáveis
   • ATTRIBUTES: tipo, liderança, tamanho, influência
   • NÃO USE PARA: Pessoas individuais

7. **DECISION** (Decisão)
   • O QUE: Escolhas importantes que impactaram significativamente a trama
   • EXEMPLOS: "Decisão de Klaus de revelar seu passado", "Escolha de abandonar a família"
   • USE COM MODERAÇÃO: Apenas decisões cruciais e bem documentadas

8. **RELATIONSHIP** (Relacionamento como conceito)
   • RARAMENTE NECESSÁRIO: Use o campo relationships ao invés
   • QUANDO USAR: Apenas se o relacionamento for um conceito nomeado
   • EXEMPLO: "O Pacto de Sangue entre as Casas"

9. **OTHER** (Outro)
   • ÚLTIMO RECURSO: Use apenas se não se encaixar em nenhuma categoria acima

**RELACIONAMENTOS - GUIA COMPLETO:**

Identifique TODOS os relacionamentos explícitos e implícitos. Seja exaustivo.

📌 **RELAÇÕES PESSOAIS** (entre CHARACTERs):
- **FAMILY** (Família): pai, mãe, irmão, filho, cônjuge, parente
  • Strength: 8-10 (laços familiares são fortes)
  • Formato: CHARACTER → CHARACTER

- **FRIENDSHIP** (Amizade): amigos, aliados próximos, companheiros
  • Strength: 5-9 (varia conforme proximidade)
  • Formato: CHARACTER → CHARACTER

- **ROMANCE** (Romance/Amor): relacionamento amoroso, paixão, interesse romântico
  • Strength: 7-10 (relações amorosas são intensas)
  • Formato: CHARACTER → CHARACTER

- **RIVALRY** (Rivalidade): rivais, competidores, antagonismo
  • Strength: 5-9 (varia conforme intensidade)
  • Formato: CHARACTER → CHARACTER

- **MENTORSHIP** (Mentor/Aprendiz): mestre e estudante, tutor e pupilo
  • Strength: 6-9 (relação de ensino/aprendizado)
  • Formato: CHARACTER (mentor) → CHARACTER (aprendiz)

🏛️ **RELAÇÕES ORGANIZACIONAIS**:
- **HIERARCHY** (Superior/Subordinado): comando, liderança, autoridade
  • Strength: 7-10 (relações de poder)
  • Formato: CHARACTER (superior) → CHARACTER (subordinado)

- **ALLIANCE** (Aliança): alianças políticas, parcerias, coalizões
  • Strength: 5-9 (varia conforme confiança)
  • Formato: FACTION → FACTION ou CHARACTER → CHARACTER

- **ENEMY** (Inimizade): inimigos declarados, oposição, hostilidade
  • Strength: 7-10 (inimizades são intensas)
  • Formato: CHARACTER → CHARACTER ou FACTION → FACTION

🔗 **RELAÇÕES CONTEXTUAIS** (entidade com mundo):
- **OWNERSHIP** (Posse): possui, é dono de
  • Strength: 5-8 (varia conforme valor)
  • Formato: CHARACTER → OBJECT

- **RESIDENCE** (Moradia): mora em, reside em, habita
  • Strength: 6-9 (importância do local)
  • Formato: CHARACTER → LOCATION

- **MEMBERSHIP** (Membro de): é membro, pertence a, integra
  • Strength: 7-10 (afiliações organizacionais)
  • Formato: CHARACTER → FACTION

- **PARTICIPATION** (Participou de): esteve presente, participou, lutou em
  • Strength: 5-9 (varia conforme protagonismo)
  • Formato: CHARACTER → EVENT

💭 **RELAÇÕES CONCEITUAIS**:
- **BELIEF** (Acredita em): segue, pratica, acredita em
  • Strength: 6-10 (varia conforme convicção)  
  • Formato: CHARACTER → CONCEPT

- **AFFILIATION** (Afiliação geral): associado com, conectado a
  • Strength: 4-7 (conexões menos específicas)
  • Formato: Qualquer → Qualquer (USE COM MODERAÇÃO - prefira tipos específicos)

**REGRAS PARA RELACIONAMENTOS:**
✅ SEMPRE especifique nomes EXATOS das entidades (fromEntityName, toEntityName)
✅ SEMPRE escolha o tipo mais ESPECÍFICO (FRIENDSHIP em vez de AFFILIATION)
✅ SEMPRE adicione descrição explicando o contexto
✅ Strength: 9-10 (crítico), 7-8 (muito importante), 5-6 (moderado), 3-4 (secundário), 1-2 (passageiro)
✅ RESPEITE os formatos (ex: OWNERSHIP só CHARACTER → OBJECT)
✅ Extraia relacionamentos implícitos (se A mora em B, crie RESIDENCE)

**EXEMPLO DE EXTRAÇÃO COMPLETA:**

Para um personagem "Klaus Von Mittelsen":
{
  "type": "CHARACTER",
  "name": "Klaus Von Mittelsen",
  "description": "Patriarca da Casa Von Mittelsen, ex-oficial da SS durante a Segunda Guerra Mundial. Homem de aparência imponente, com cabelos grisalhos e olhos penetrantes de cor azul-aço. Possui uma cicatriz discreta na têmpora esquerda, lembrança de seu passado militar. Personalidade calculista e estratégica, esconde profundos segredos sobre suas ações durante a guerra. Atualmente reside na Biblioteca de Memórias, onde preserva registros históricos controversos.",
  "attributes": {
    "idade": "79 anos",
    "origem": "Alemanha",
    "profissão": "Ex-Oficial Militar / Patriarca",
    "aparência": "Cabelos grisalhos, olhos azuis, cicatriz na têmpora",
    "personalidade": "Calculista, estratégico, reservado",
    "habilidades": "Liderança, estratégia militar, conhecimento histórico"
  },
  "importance": 10,
  "aliases": ["O Patriarca", "Klaus", "Von Mittelsen"]
}

FORMATO DE RESPOSTA (APENAS JSON PURO):
{
  "entities": [
    {
      "type": "CHARACTER" | "LOCATION" | "FACTION" | "EVENT" | "OBJECT" | "CONCEPT" | "DECISION" | "RELATIONSHIP" | "OTHER",
      "name": "Nome Completo da Entidade",
      "description": "Descrição DETALHADA com 3-5 frases para principais, 2-3 para secundários",
      "attributes": {
        "atributo1": "valor",
        "atributo2": "valor",
        "todoOsAtributosMencionados": "valor"
      },
      "importance": 1-10,
      "aliases": ["TodosOsNomesAlternativos", "Apelidos", "Títulos"]
    }
  ],
  "relationships": [
    {
      "fromEntityName": "Nome EXATO da Entidade Origem",
      "toEntityName": "Nome EXATO da Entidade Destino",
      "type": "FAMILY" | "FRIENDSHIP" | "ROMANCE" | "RIVALRY" | "MENTORSHIP" | "HIERARCHY" | "ALLIANCE" | "ENEMY" | "OWNERSHIP" | "RESIDENCE" | "MEMBERSHIP" | "PARTICIPATION" | "BELIEF" | "AFFILIATION",
      "description": "Explicação clara da relação",
      "strength": 1-10
    }
  ]
}

🎯 LEMBRE-SE: Este é um DOSSIÊ COMPLETO. Pode ter dezenas ou até centenas de entidades. EXTRAIA TUDO!
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
