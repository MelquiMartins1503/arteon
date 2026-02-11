"use server";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";

export type StorySidebarItem = {
  id: number;
  uuid: string;
  title: string | null;
  updatedAt: Date;
  order: number;
};

export async function getStories(): Promise<StorySidebarItem[]> {
  try {
    const user = await getAuthenticatedUser();

    const stories = await prismaClient.story.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        updatedAt: true,
        order: true,
      },
    });

    return stories;
  } catch (error) {
    logger.error({ error }, "Failed to fetch stories");
    return [];
  }
}

export async function updateStoriesOrder(
  items: { uuid: string; order: number }[],
) {
  try {
    const user = await getAuthenticatedUser();

    // Verify ownership of all stories before updating
    // Ideally we should do this, but for now we'll rely on the updateMany with userId check or individual updates
    // For bulk update with different values, transaction is best.

    await prismaClient.$transaction(
      items.map((item) =>
        prismaClient.story.update({
          where: { uuid: item.uuid, userId: user.id },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  } catch (error) {
    logger.error({ error }, "Failed to update story order");
    return { success: false };
  }
}

export async function deleteStory(uuid: string) {
  try {
    const user = await getAuthenticatedUser();

    // Com onDelete: Cascade configurado no schema,
    // o Prisma/PostgreSQL automaticamente deleta:
    // 1. ConversationHistory relacionado
    // 2. Messages do ConversationHistory (via onDelete: Cascade em Message)
    await prismaClient.story.delete({
      where: {
        uuid,
        userId: user.id,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error({ error }, "Failed to delete story");
    return { success: false };
  }
}

export async function createStory(data: {
  title: string;
  description?: string;
}) {
  try {
    const user = await getAuthenticatedUser();

    // Find the current max order to append at the end
    const lastStory = await prismaClient.story.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = (lastStory?.order ?? -1) + 1;

    const story = await prismaClient.story.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        order: newOrder,
        conversationHistory: {
          create: {}, // Initialize empty conversation history
        },
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        updatedAt: true,
        order: true,
      },
    });

    return {
      success: true,
      storyId: story.id,
      storyUuid: story.uuid,
      story: {
        id: story.id,
        uuid: story.uuid,
        title: story.title,
        updatedAt: story.updatedAt,
        order: story.order,
      },
    };
  } catch (error) {
    logger.error({ error }, "Failed to create story");
    return { success: false, error: "Falha ao criar história" };
  }
}

export async function updateStoryPrompt(data: {
  storyUuid: string;
  title?: string;
  description?: string;
  customPrompt: string;
  knowledgeBaseInput?: string;
}) {
  try {
    const user = await getAuthenticatedUser();

    // Verify story ownership
    const story = await prismaClient.story.findUnique({
      where: { uuid: data.storyUuid },
      include: { conversationHistory: true },
    });

    if (!story) {
      return { success: false, error: "História não encontrada" };
    }

    if (story.userId !== user.id) {
      return { success: false, error: "Acesso negado" };
    }

    // Tratamento para inconsistências onde o Prisma pode retornar array ou objeto
    const historyData = story.conversationHistory;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatSessionReference = Array.isArray(historyData)
      ? historyData[0]
      : historyData;

    if (!chatSessionReference) {
      return {
        success: false,
        error: "Histórico de conversas não encontrado",
      };
    }

    // Update the story title and description if provided
    if (data.title !== undefined || data.description !== undefined) {
      await prismaClient.story.update({
        where: { id: story.id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && {
            description: data.description || null,
          }),
        },
      });
    }

    // Update the customPrompt in ConversationHistory
    await prismaClient.conversationHistory.update({
      where: { id: chatSessionReference.id },
      data: { customPrompt: data.customPrompt || null },
    });

    // Process Knowledge Base Input if provided
    /* KNOWLEDGE BASE DISABLED
    if (data.knowledgeBaseInput?.trim()) {
      try {
        const {
          KnowledgeBaseParser,
          EntityManager,
          RelationshipManager,
          KnowledgeExtractor,
        } = await import("@/services/knowledge");

        const parser = new KnowledgeBaseParser();
        let parsed = parser.parseInput(data.knowledgeBaseInput);

        // Fallback Inteligente: Se o parsing manual não encontrou estrutura clara
        // ou retornou resultados vazios para um texto denso, usar a IA.
        // NOVO: Textos muito grandes SEMPRE usam IA (têm chunking)
        const hasMarkdownHeaders = /^\s*#{1,6}\s+/m.test(
          data.knowledgeBaseInput,
        );
        const isLongText = data.knowledgeBaseInput.length > 100;
        const isVeryLongText = data.knowledgeBaseInput.length > 50000; // 50k+

        if (
          isVeryLongText ||
          parsed.entities.length === 0 ||
          (!hasMarkdownHeaders && isLongText)
        ) {
          logger.info(
            {
              reason: isVeryLongText
                ? "Texto muito grande (>50k) - usando IA com chunking"
                : "Parsing manual insuficiente ou texto não estruturado",
              textLength: data.knowledgeBaseInput.length,
            },
            "Usando IA para extração do dossiê.",
          );
          try {
            const extractor = new KnowledgeExtractor();
            const aiResult = await extractor.extractFromDossier(
              data.knowledgeBaseInput,
            );

            // Só substituir se a IA encontrou algo útil
            if (aiResult.entities.length > 0) {
              logger.info(
                {
                  entitiesFound: aiResult.entities.length,
                  relationshipsFound: aiResult.relationships.length,
                },
                "Extração via IA bem sucedida",
              );
              parsed = aiResult;
            }
          } catch (aiError) {
            logger.error(
              { error: aiError },
              "Falha no fallback de IA, mantendo resultado do parser manual",
            );
          }
        }

        logger.info(
          {
            storyId: story.uuid,
            entitiesCount: parsed.entities.length,
            relationshipsCount: parsed.relationships.length,
            usedAI: !hasMarkdownHeaders && isLongText,
          },
          "Processing Knowledge Base Import",
        );

        // Import entities
        const entityManager = new EntityManager();
        const entityResults = await entityManager.processExtractedEntities(
          story.uuid,
          parsed.entities,
          undefined, // No message ID for manual imports
        );

        logger.info(
          {
            storyId: story.uuid,
            created: entityResults.created,
            updated: entityResults.updated,
            skipped: entityResults.skipped,
          },
          "✅ Entities imported from Knowledge Base Input",
        );

        // Import relationships
        const relationshipManager = new RelationshipManager();
        const relationshipCount =
          await relationshipManager.processExtractedRelationships(
            story.uuid,
            parsed.relationships,
            undefined, // No message ID for manual imports
          );

        logger.info(
          {
            storyId: story.uuid,
            relationshipsCreated: relationshipCount,
          },
          "🔗 Relationships imported from Knowledge Base Input",
        );

        // Return success with import statistics
        return {
          success: true,
          importStats: {
            entitiesCreated: entityResults.created,
            entitiesUpdated: entityResults.updated,
            relationshipsCreated: relationshipCount,
          },
        };
      } catch (error) {
        logger.error(
          { error, storyUuid: data.storyUuid },
          "Failed to process Knowledge Base Input",
        );
        // Don't fail the whole operation, just log the error
      }
    }
    */
    // Knowledge base import desativado
    if (data.knowledgeBaseInput?.trim()) {
      logger.info(
        { storyUuid: data.storyUuid },
        "Knowledge base import está desativado - input ignorado",
      );
    }

    return { success: true };
  } catch (error) {
    logger.error(
      { error, storyUuid: data.storyUuid },
      "Failed to update story prompt",
    );
    return { success: false, error: "Erro ao atualizar prompt" };
  }
}
