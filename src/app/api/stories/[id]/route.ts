import { type NextRequest, NextResponse } from "next/server";
import prismaClient from "@/lib/prismaClient";
import { apiErrorHandler } from "@/utils/apiErrorHandlers";
import { HttpExceptionClient } from "@/utils/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/utils/getAuthenticatedUser";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: storyIdStr } = await params;
    const storyId = Number(storyIdStr);

    if (Number.isNaN(storyId)) {
      throw new HttpExceptionClient(400, "ID da história inválido");
    }

    // Verificar se a história existe e pertence ao usuário
    const story = await prismaClient.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
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

    // Realizar a deleção em transação para garantir integridade
    await prismaClient.$transaction(async (tx) => {
      // 1. Deletar Histórico de Conversa (e mensagens associadas)
      const conversationHistory = await tx.conversationHistory.findUnique({
        where: { storyId },
      });

      if (conversationHistory) {
        await tx.message.deleteMany({
          where: { conversationHistoryId: conversationHistory.id },
        });
        await tx.conversationHistory.delete({
          where: { id: conversationHistory.id },
        });
      }

      // 4. Finalmente, deletar a História
      await tx.story.delete({
        where: { id: storyId },
      });
    });

    return NextResponse.json(
      { message: "História deletada com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    return await apiErrorHandler(error);
  }
}
