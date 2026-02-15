import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import prismaClient from "@/lib/prismaClient";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string; messageId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { uuid, messageId } = await params;
    const messageDbId = Number.parseInt(messageId, 10);

    if (Number.isNaN(messageDbId)) {
      throw new HttpExceptionClient(400, "ID de mensagem inválido");
    }

    // Validar propriedade da história
    const story = await prismaClient.story.findUnique({
      where: { uuid },
      include: {
        conversationHistory: true,
      },
    });

    if (!story) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    if (story.userId !== user.id) {
      throw new HttpExceptionClient(403, "Acesso negado");
    }

    // Buscar a mensagem alvo (deve ser do Modelo)
    const targetMessage = await prismaClient.message.findUnique({
      where: { id: messageDbId },
    });

    if (!targetMessage) {
      throw new HttpExceptionClient(404, "Mensagem não encontrada");
    }

    // Verificar se a mensagem pertence a um histórico desta história
    const historyIds = Array.isArray(story.conversationHistory)
      ? story.conversationHistory.map((h) => h.id)
      : story.conversationHistory
        ? [story.conversationHistory.id]
        : [];

    if (!historyIds.includes(targetMessage.conversationHistoryId)) {
      throw new HttpExceptionClient(
        403,
        "A mensagem não pertence a esta história",
      );
    }

    // Identificar ids para deleção (A mensagem da IA e a pergunta do usuário anterior)
    const idsToDelete = [targetMessage.id];

    // Buscar a mensagem imediatamente anterior
    const previousMessage = await prismaClient.message.findFirst({
      where: {
        conversationHistoryId: targetMessage.conversationHistoryId,
        id: { lt: targetMessage.id },
      },
      orderBy: {
        id: "desc",
      },
    });

    // Se a anterior for do usuário, deleta também
    if (previousMessage && previousMessage.role === "USER") {
      idsToDelete.push(previousMessage.id);
    }

    // Executar deleção
    await prismaClient.message.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });

    return NextResponse.json(
      { success: true, deletedIds: idsToDelete },
      { status: 200 },
    );
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
