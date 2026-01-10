import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import type { NarrativeCommand } from "./CommandDetector";

/**
 * Intercepta comandos PAUSAR_NARRATIVA e RETOMAR_NARRATIVA
 * para gerenciar o estado do modo pausa
 */
export async function handlePauseModeCommands(
  rawCommand: NarrativeCommand,
  isInPauseMode: boolean,
  conversationHistoryId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
): Promise<NextResponse | null> {
  // Ativar modo pausa
  if (rawCommand === "PAUSAR_NARRATIVA" && !isInPauseMode) {
    await prisma.conversationHistory.update({
      where: { id: conversationHistoryId },
      data: { pauseNarrativeMode: true },
    });

    logger.info("Modo PAUSAR NARRATIVA ativado");

    return NextResponse.json(
      {
        message:
          "**Modo PAUSAR NARRATIVA Ativado**\n\nA narrativa está congelada. Você pode:\n- Discutir estratégias e ideias\n- Revisar detalhes de personagens e eventos\n- Fazer brainstorming sem comprometer-se\n- Planejar desenvolvimentos futuros\n\nQuando estiver pronto para retomar, use **[RETOMAR NARRATIVA]**.",
        suggestedPrompts: [],
      },
      { status: 200 },
    );
  }

  // Desativar modo pausa (Retomar Narrativa)
  if (rawCommand === "RETOMAR_NARRATIVA" && isInPauseMode) {
    await prisma.conversationHistory.update({
      where: { id: conversationHistoryId },
      data: { pauseNarrativeMode: false },
    });

    logger.info("Modo PAUSAR NARRATIVA desativado - retomando narrativa");

    // Carregar último DECA para exibir
    const lastDeca = await prisma.message.findFirst({
      where: {
        conversationHistoryId,
        messageType: "DECA",
      },
      orderBy: { createdAt: "desc" },
    });

    const decaContent =
      lastDeca?.content ||
      "Nenhum DECA encontrado. Comece gerando um com [GERAR DECA].";

    return NextResponse.json(
      {
        message: `**NARRATIVA RETOMADA**\n\n${decaContent}\n\n---\n\n**Próximo passo recomendado:**\n- **[SUGERIR PRÓXIMA SEÇÃO]** → Planejar próximo passo\n\nAguardando seu comando.`,
        suggestedPrompts: [],
      },
      { status: 200 },
    );
  }

  // Não houve interceptação
  return null;
}
