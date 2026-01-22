import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";

/**
 * API: POST /api/stories/[uuid]/deduplicate-entities
 *
 * Detecta e unifica entidades duplicadas usando IA
 * - Fase 1: Detecta duplicatas (mesma entidade com nomes variantes)
 * - Fase 2: Detecta irrelevantes (informações temporárias/redundantes)
 * - Fase 3: Executa merge de duplicatas
 * - Fase 4: Arquiva irrelevantes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;

    logger.info({ storyId: uuid }, "🔍 Iniciando deduplicação de entidades");

    // Buscar todas as entidades ativas da história
    const entities = await prismaClient.storyEntity.findMany({
      where: {
        storyId: uuid,
        status: "ACTIVE",
      },
      select: {
        id: true,
        type: true,
        name: true,
        aliases: true,
        description: true,
        importance: true,
      },
      orderBy: { type: "asc" },
    });

    logger.info(
      { totalEntities: entities.length },
      "📊 Entidades carregadas para análise",
    );

    if (entities.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma entidade para processar",
        duplicatesFound: 0,
        irrelevantFound: 0,
      });
    }

    // Agrupar entidades por tipo
    const entitiesByType = entities.reduce(
      (acc, entity) => {
        if (!acc[entity.type]) {
          acc[entity.type] = [];
        }
        acc[entity.type]!.push(entity);
        return acc;
      },
      {} as Record<string, typeof entities | undefined>,
    );

    // FASE 1: Detectar duplicatas via IA
    const duplicateGroups: Array<{
      canonical: number;
      duplicates: number[];
    }> = [];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Quota maior: 15 RPM
      generationConfig: {
        responseMimeType: "application/json", // Force JSON output
      },
    });

    for (const [type, typeEntities] of Object.entries(entitiesByType)) {
      if (!typeEntities || typeEntities.length < 2) continue; // Precisa de pelo menos 2 para ter duplicata

      logger.info(
        { type, count: typeEntities.length },
        "🔎 Analisando duplicatas para tipo",
      );

      const duplicatePrompt = `
Você é um especialista em detecção de duplicatas em bases de conhecimento.

**TAREFA:** Identifique grupos de entidades que representam a MESMA coisa com nomes diferentes.

**TIPO DE ENTIDADE:** ${type}

**LISTA DE ENTIDADES:**

${typeEntities
  .map(
    (e, idx) => `
${idx + 1}. ID: ${e.id}
   Nome: ${e.name}
   Aliases: ${e.aliases.join(", ") || "nenhum"}
   Descrição: ${e.description.substring(0, 200)}...
   Importância: ${e.importance}
`,
  )
  .join("\n")}

**CRITÉRIOS PARA DUPLICATAS:**
1. Mesma pessoa com variações de nome (ex: "Isolde" vs "Isolde Von Adler")
2. Mesmo local com nomes diferentes
3. Mesma organização/facção com nomes variantes

**IMPORTANTE:**
- Se dois nomes representam a MESMA entidade, são duplicatas
- Se representam entidades DIFERENTES, NÃO são duplicatas
- Em cada grupo, defina qual é a entidade CANÔNICA (mais completa/detalhada)

**SAÍDA - RETORNE APENAS JSON VÁLIDO:**
CRITICAL: Sua resposta deve ser APENAS um array JSON válido, sem texto adicional.
Certifique-se de usar vírgulas entre propriedades e entre objetos.

Formato correto:
[
  {
    "canonical": 123,
    "duplicates": [456, 789]
  },
  {
    "canonical": 234,
    "duplicates": [567]
  }
]

Se não houver duplicatas, retorne: []

IMPORTANTE: Use apenas IDs numéricos que existem na lista acima.
`;

      try {
        const result = await model.generateContent(duplicatePrompt);
        const responseText = result.response.text();

        logger.info(
          { type, responseLength: responseText.length },
          "📝 Resposta do modelo recebida",
        );

        // With JSON mode, entire response is valid JSON
        try {
          const detected = JSON.parse(responseText);
          if (Array.isArray(detected) && detected.length > 0) {
            duplicateGroups.push(...detected);
            logger.info(
              { type, groupsFound: detected.length },
              "✅ Grupos de duplicatas detectados",
            );
          } else if (!Array.isArray(detected)) {
            logger.warn(
              { type, receivedType: typeof detected },
              "⚠️ Resposta não é um array",
            );
          }
        } catch (parseError) {
          logger.error(
            {
              type,
              responsePreview: responseText.substring(0, 300),
              parseError:
                parseError instanceof Error
                  ? { message: parseError.message, stack: parseError.stack }
                  : parseError,
            },
            "❌ Falha ao parsear resposta JSON de duplicatas",
          );
        }
      } catch (error) {
        logger.error(
          {
            error:
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error,
            type,
          },
          "❌ Erro ao detectar duplicatas para tipo",
        );
      }

      // Delay para evitar rate limit (5s entre tipos)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // FASE 2: Detectar entidades irrelevantes via IA
    const irrelevantEntities: number[] = [];

    for (const [type, typeEntities] of Object.entries(entitiesByType)) {
      if (!typeEntities) continue; // Verificar se existe

      logger.info(
        { type, count: typeEntities.length },
        "🗑️ Analisando relevância para tipo",
      );

      const relevancePrompt = `
Você é um especialista em curadoria de bases de conhecimento.

**CONTEXTO:** Esta é uma base de conhecimento de REFERÊNCIA para uma história narrativa.
As mensagens/seções narrativas já são carregadas separadamente no contexto.

**TAREFA:** Identifique entidades que são **IRRELEVANTES** ou **REDUNDANTES** para uma KB de referência.

**CRITÉRIOS DE IRRELEVÂNCIA:**
1. Eventos narrativos específicos (ex: "Reunião de 15 de março")
2. Estados temporários (ex: "Klaus zangado")
3. Descrições de cenas (ex: "Escritório escuro")
4. Ações pontuais (ex: "Klaus caminhou")
5. Entidades genéricas demais (ex: "A reunião", "O encontro")
6. Informações que mudam constantemente (não permanentes)

**CRITÉRIOS DE RELEVÂNCIA (manter):**
1. Personagens permanentes com descrição estável
2. Locais geográficos ou estruturas importantes
3. Facções/organizações estabelecidas
4. Conceitos fundamentais do universo narrativo
5. Informações que serão verdadeiras em 10+ capítulos

**TIPO:** ${type}

**LISTA DE ENTIDADES:**

${typeEntities
  .map(
    (e, idx) => `
${idx + 1}. ID: ${e.id}
   Nome: ${e.name}
   Descrição: ${e.description}
   Importância: ${e.importance}
`,
  )
  .join("\n")}

**SAÍDA - RETORNE APENAS JSON VÁLIDO:**
CRITICAL: Sua resposta deve ser APENAS um array JSON com IDs numéricos, sem texto adicional.
Certifique-se de usar vírgulas entre os números.

Formato correto:
[123, 456, 789]

Se todas forem relevantes, retorne: []

IMPORTANTE: Use apenas IDs numéricos que existem na lista acima.
`;

      try {
        const result = await model.generateContent(relevancePrompt);
        const responseText = result.response.text();

        logger.info(
          { type, responseLength: responseText.length },
          "📝 Resposta de relevância recebida",
        );

        // With JSON mode, entire response is valid JSON
        try {
          const detected = JSON.parse(responseText);
          if (Array.isArray(detected) && detected.length > 0) {
            irrelevantEntities.push(...detected);
            logger.info(
              { type, irrelevantFound: detected.length },
              "✅ Entidades irrelevantes detectadas",
            );
          } else if (!Array.isArray(detected)) {
            logger.warn(
              { type, receivedType: typeof detected },
              "⚠️ Resposta não é um array",
            );
          }
        } catch (parseError) {
          logger.error(
            {
              type,
              responsePreview: responseText.substring(0, 300),
              parseError:
                parseError instanceof Error
                  ? { message: parseError.message, stack: parseError.stack }
                  : parseError,
            },
            "❌ Falha ao parsear resposta JSON de irrelevantes",
          );
        }
      } catch (error) {
        logger.error(
          {
            error:
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error,
            type,
          },
          "❌ Erro ao detectar irrelevantes para tipo",
        );
      }

      // Delay para evitar rate limit (5s entre tipos)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // FASE 3: Executar merge de duplicatas
    let mergedCount = 0;

    for (const group of duplicateGroups) {
      try {
        const { canonical, duplicates } = group;

        if (!canonical || !duplicates || duplicates.length === 0) continue;

        logger.info(
          { canonical, duplicates },
          "🔄 Mesclando duplicatas no canônico",
        );

        // Buscar entidade canônica e duplicatas
        const [canonicalEntity, duplicateEntities] = await Promise.all([
          prismaClient.storyEntity.findUnique({
            where: { id: canonical },
          }),
          prismaClient.storyEntity.findMany({
            where: { id: { in: duplicates } },
          }),
        ]);

        if (!canonicalEntity) {
          logger.error({ canonical }, "❌ Entidade canônica não encontrada");
          continue;
        }

        // Consolidar aliases
        const allAliases = new Set([
          ...canonicalEntity.aliases,
          ...duplicateEntities.flatMap((d) => [d.name, ...d.aliases]),
        ]);
        allAliases.delete(canonicalEntity.name); // Remove o nome canônico dos aliases

        // Consolidar atributos
        const consolidatedAttributes = {
          ...(canonicalEntity.attributes as object),
        };

        for (const dup of duplicateEntities) {
          Object.assign(consolidatedAttributes, dup.attributes as object);
        }

        // Atualizar entidade canônica
        await prismaClient.storyEntity.update({
          where: { id: canonical },
          data: {
            aliases: Array.from(allAliases),
            attributes: consolidatedAttributes,
          },
        });

        // Redirecionar relacionamentos das duplicatas para a canônica
        await Promise.all([
          // Relacionamentos FROM
          prismaClient.entityRelationship.updateMany({
            where: { fromEntityId: { in: duplicates } },
            data: { fromEntityId: canonical },
          }),
          // Relacionamentos TO
          prismaClient.entityRelationship.updateMany({
            where: { toEntityId: { in: duplicates } },
            data: { toEntityId: canonical },
          }),
        ]);

        // Marcar duplicatas como MERGED
        await prismaClient.storyEntity.updateMany({
          where: { id: { in: duplicates } },
          data: {
            status: "MERGED",
            mergedIntoId: canonical,
          },
        });

        mergedCount += duplicates.length;

        logger.info(
          { canonical, mergedCount: duplicates.length },
          "✅ Duplicatas mescladas com sucesso",
        );
      } catch (error) {
        logger.error(
          { error, group },
          "❌ Erro ao mesclar grupo de duplicatas",
        );
      }
    }

    // FASE 4: Arquivar irrelevantes
    let archivedCount = 0;

    if (irrelevantEntities.length > 0) {
      await prismaClient.storyEntity.updateMany({
        where: { id: { in: irrelevantEntities } },
        data: { status: "ARCHIVED" },
      });

      archivedCount = irrelevantEntities.length;

      logger.info(
        { count: archivedCount },
        "🗑️ Entidades irrelevantes arquivadas",
      );
    }

    return NextResponse.json({
      success: true,
      duplicatesFound: duplicateGroups.reduce(
        (sum, g) => sum + g.duplicates.length,
        0,
      ),
      duplicatesMerged: mergedCount,
      irrelevantFound: irrelevantEntities.length,
      irrelevantArchived: archivedCount,
      duplicateGroups: duplicateGroups.map((g) => ({
        canonical: g.canonical,
        duplicatesCount: g.duplicates.length,
      })),
    });
  } catch (error) {
    logger.error({ error }, "❌ Erro na deduplicação de entidades");
    return NextResponse.json(
      { success: false, error: "Erro ao deduplificar entidades" },
      { status: 500 },
    );
  }
}
