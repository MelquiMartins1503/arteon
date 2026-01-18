import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { KnowledgeRebuilder } from "@/services/knowledge/KnowledgeRebuilder";

/**
 * Reconstrói a knowledge base de uma história
 * ATENÇÃO: Esta operação é DESTRUTIVA e IRREVERSÍVEL
 *
 * DELETE todas entidades, relacionamentos e versões
 * Re-extrai conhecimento de todas as mensagens SECTION_PROPOSAL e SECTION_CONTENT
 *
 * Requer: ?confirm=true para executar
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { uuid: storyUuid } = await params;

    // Verificar confirmação
    const url = new URL(request.url);
    const confirm = url.searchParams.get("confirm");

    if (confirm !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: "Confirmação necessária. Use ?confirm=true",
          warning:
            "Esta operação irá DELETAR TODAS as entidades, relacionamentos e versões desta história e reconstruir do zero.",
        },
        { status: 400 },
      );
    }

    // Verificar ownership da história
    const story = await prismaClient.story.findUnique({
      where: { uuid: storyUuid },
      select: {
        id: true,
        userId: true,
        title: true,
      },
    });

    if (!story) {
      return NextResponse.json(
        { success: false, error: "História não encontrada" },
        { status: 404 },
      );
    }

    if (story.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    logger.warn(
      {
        storyUuid,
        storyTitle: story.title,
        userId: user.id,
      },
      "🔥 REBUILD INICIADO PELO USUÁRIO",
    );

    // Executar rebuild
    const rebuilder = new KnowledgeRebuilder();
    const stats = await rebuilder.rebuildForStory(storyUuid);

    logger.info(
      {
        storyUuid,
        stats,
      },
      "✅ Rebuild concluído",
    );

    return NextResponse.json(
      {
        success: true,
        message: "Knowledge base reconstruída com sucesso",
        stats,
      },
      { status: 200 },
    );
  } catch (error) {
    const { uuid: storyUuid } = await params;
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        storyUuid,
      },
      "Erro ao reconstruir knowledge base",
    );

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao reconstruir knowledge base",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
