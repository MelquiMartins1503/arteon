import { CHAT_CONFIG } from "@/config/chat.config";
import type { MessageType } from "@/types/chat";

/**
 * Tipo de comando detectado no protocolo narrativo
 */
export type NarrativeCommand =
  | "GERAR_DECA"
  | "SUGERIR_PROXIMA_SECAO"
  | "SUGERIR_ESTRUTURA_DE_SECOES"
  | "APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA"
  | "APROVAR_E_SELAR_ESBOÇO"
  | "REVISAR_E_CORRIGIR"
  | "PAUSAR_NARRATIVA"
  | "RETOMAR_NARRATIVA"
  | "GENERAL";

/**
 * Detecta comandos especiais nas mensagens do usuário
 */
export class CommandDetector {
  /**
   * Padrões Regex para detectar comandos do protocolo narrativo
   */
  private readonly COMMAND_PATTERNS = {
    GERAR_DECA: /\[GERAR\s+DECA\]/i,
    SUGERIR_PROXIMA_SECAO: /\[SUGERIR\s+PR[OÓ]XIMA\s+SE[ÇC][AÃ]O\]/i,
    SUGERIR_ESTRUTURA_DE_SECOES: /\[SUGERIR\s+ESTRUTURA\s+DE\s+SE[ÇC][ÕO]ES\]/i,
    APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA:
      /\[APROVAR\s+E\s+SELAR\s+ESBO[ÇC]O\s+DE\s+ESTRUTURA\]/i,
    APROVAR_E_SELAR_ESBOÇO: /\[APROVAR\s+E\s+SELAR\s+ESBO[ÇC]O\]/i,
    REVISAR_E_CORRIGIR: /\[REVISAR\s+E\s+CORRIGIR\s+SE[ÇC][AÃ]O\]/i,
    PAUSAR_NARRATIVA: /\[PAUSAR\s+NARRATIVA.*?\]/i,
    RETOMAR_NARRATIVA: /\[RETOMAR\s+NARRATIVA\]/i,
  };

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
    return (
      prompt.includes(CHAT_CONFIG.commands.approveDraft) ||
      this.COMMAND_PATTERNS.APROVAR_E_SELAR_ESBOÇO.test(prompt)
    );
  }

  /**
   * Verifica se a mensagem contém o comando de revisar seção
   */
  hasReviewCommand(prompt: string): boolean {
    return (
      prompt.includes(CHAT_CONFIG.commands.reviewSection) ||
      this.COMMAND_PATTERNS.REVISAR_E_CORRIGIR.test(prompt)
    );
  }

  /**
   * Detecta qual comando narrativo está presente na mensagem
   */
  detectNarrativeCommand(prompt: string): NarrativeCommand {
    if (this.COMMAND_PATTERNS.GERAR_DECA.test(prompt)) {
      return "GERAR_DECA";
    }
    if (this.COMMAND_PATTERNS.SUGERIR_PROXIMA_SECAO.test(prompt)) {
      return "SUGERIR_PROXIMA_SECAO";
    }
    if (this.COMMAND_PATTERNS.SUGERIR_ESTRUTURA_DE_SECOES.test(prompt)) {
      return "SUGERIR_ESTRUTURA_DE_SECOES";
    }
    if (
      this.COMMAND_PATTERNS.APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA.test(prompt)
    ) {
      return "APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA";
    }
    if (this.COMMAND_PATTERNS.APROVAR_E_SELAR_ESBOÇO.test(prompt)) {
      return "APROVAR_E_SELAR_ESBOÇO";
    }
    if (this.COMMAND_PATTERNS.REVISAR_E_CORRIGIR.test(prompt)) {
      return "REVISAR_E_CORRIGIR";
    }
    if (this.COMMAND_PATTERNS.PAUSAR_NARRATIVA.test(prompt)) {
      return "PAUSAR_NARRATIVA";
    }
    if (this.COMMAND_PATTERNS.RETOMAR_NARRATIVA.test(prompt)) {
      return "RETOMAR_NARRATIVA";
    }
    return "GENERAL";
  }

  /**
   * Infere o tipo de mensagem que será gerada pela IA com base no comando
   */
  inferResponseMessageType(command: NarrativeCommand): MessageType {
    const typeMap: Record<NarrativeCommand, MessageType> = {
      GERAR_DECA: "DECA",
      SUGERIR_PROXIMA_SECAO: "SECTION_PROPOSAL",
      SUGERIR_ESTRUTURA_DE_SECOES: "SECTION_STRUCTURE",
      APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA: "SECTION_PROPOSAL", // Gera primeira seção
      APROVAR_E_SELAR_ESBOÇO: "SECTION_CONTENT",
      REVISAR_E_CORRIGIR: "REVISION_REQUEST",
      PAUSAR_NARRATIVA: "GENERAL",
      RETOMAR_NARRATIVA: "SYSTEM",
      GENERAL: "GENERAL",
    };

    return typeMap[command];
  }

  /**
   * Infere o tipo de mensagem do usuário com base no comando
   */
  inferUserMessageType(command: NarrativeCommand): MessageType {
    // Comandos do sistema não são salvos como mensagens do usuário normalmente
    if (command === "RETOMAR_NARRATIVA") {
      return "SYSTEM";
    }
    // Outros comandos são GENERAL (comandos do usuário)
    return "GENERAL";
  }

  /**
   * Determina se a mensagem do usuário deve ser marcada como meta
   * (não aparecerá no histórico enviado à IA)
   */
  shouldMarkAsMeta(command: NarrativeCommand): boolean {
    // Comandos narrativos são meta-conversacionais (instruções, não conteúdo)
    const narrativeCommands: NarrativeCommand[] = [
      "GERAR_DECA",
      "SUGERIR_PROXIMA_SECAO",
      "SUGERIR_ESTRUTURA_DE_SECOES",
      "APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA",
      "APROVAR_E_SELAR_ESBOÇO",
      "REVISAR_E_CORRIGIR",
      "PAUSAR_NARRATIVA",
      "RETOMAR_NARRATIVA",
    ];

    return narrativeCommands.includes(command);
  }

  /**
   * Verifica se a mensagem deve ser marcada como importante
   * baseado na detecção de comandos
   */
  shouldMarkAsImportant(prompt: string, explicitImportant: boolean): boolean {
    const command = this.detectNarrativeCommand(prompt);
    // Comandos narrativos estruturais são automaticamente importantes
    const isStructuralCommand = [
      "GERAR_DECA",
      "SUGERIR_PROXIMA_SECAO",
      "SUGERIR_ESTRUTURA_DE_SECOES",
      "APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA",
      "APROVAR_E_SELAR_ESBOÇO",
    ].includes(command);

    return (
      this.hasApproveCommand(prompt) ||
      this.hasReviewCommand(prompt) ||
      isStructuralCommand ||
      explicitImportant
    );
  }
}
