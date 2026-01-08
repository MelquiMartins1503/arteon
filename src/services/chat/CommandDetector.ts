import { CHAT_CONFIG } from "@/config/chat.config";

/**
 * Detecta comandos especiais nas mensagens do usuário
 */
export class CommandDetector {
  /**
   * Verifica se a mensagem contém o comando de finalizar idealização
   */
  isFinalizeIdealizationCommand(prompt: string): boolean {
    return prompt.trim() === CHAT_CONFIG.commands.finalizeIdealization;
  }

  /**
   * Verifica se a mensagem contém o comando de aprovar esboço
   */
  hasApproveCommand(prompt: string): boolean {
    return prompt.includes(CHAT_CONFIG.commands.approveDraft);
  }

  /**
   * Verifica se a mensagem contém o comando de revisar seção
   */
  hasReviewCommand(prompt: string): boolean {
    return prompt.includes(CHAT_CONFIG.commands.reviewSection);
  }

  /**
   * Verifica se a mensagem deve ser marcada como importante
   * baseado na detecção de comandos
   */
  shouldMarkAsImportant(prompt: string, explicitImportant: boolean): boolean {
    return (
      this.hasApproveCommand(prompt) ||
      this.hasReviewCommand(prompt) ||
      explicitImportant
    );
  }
}
