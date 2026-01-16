import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import prismaClient from "@/lib/prismaClient";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { uuid: storyUuid } = await params;

    // Verificar se a história existe e pertence ao usuário
    const story = await prismaClient.story.findUnique({
      where: { uuid: storyUuid },
      select: { userId: true, id: true },
    });

    if (!story) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    if (story.userId !== user.id) {
      throw new HttpExceptionClient(
        403,
        "Sem permissão para deletar esta história",
      );
    }

    // Com onDelete: Cascade configurado no schema do Prisma,
    // o PostgreSQL automaticamente deleta em cascata:
    // 1. ConversationHistory (via Story.conversationHistory onDelete: Cascade)
    // 2. Messages (via ConversationHistory.messages onDelete: Cascade)
    await prismaClient.story.delete({
      where: { id: story.id },
    });

    return NextResponse.json(
      { message: "História deletada com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    return await apiErrorHandler(error);
  }
}
