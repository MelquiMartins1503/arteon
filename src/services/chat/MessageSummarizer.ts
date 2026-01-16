import type { GoogleGenerativeAI } from "@google/generative-ai";
import { CHAT_CONFIG } from "@/config/chat.config";
import logger from "@/lib/logger";

/**
 * Serviço para resumir mensagens de chat
 */
export class MessageSummarizer {
  constructor(private genAI: GoogleGenerativeAI) {}

  /**
   * Resume uma mensagem longa mantendo apenas informações críticas
   */
  async summarizeMessage(messageContent: string): Promise<string> {
    try {
      const summaryModel = this.genAI.getGenerativeModel({
        model: CHAT_CONFIG.ai.model,
        safetySettings: CHAT_CONFIG.ai.safetySettings,
      });

      const summaryPrompt = this.buildSummaryPrompt(messageContent);

      const result = await summaryModel.generateContent(summaryPrompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error({ error }, "Erro ao gerar resumo");

      // Fallback: truncar se a IA falhar
      return `${messageContent.substring(0, CHAT_CONFIG.summary.maxMessageLength)}...`;
    }
  }

  /**
   * Constrói o prompt para resumir mensagens longas
   */
  private buildSummaryPrompt(messageContent: string): string {
    return `
    Resuma a seguinte mensagem mantendo APENAS as informações críticas e essenciais:
    - Nomes de personagens, locais, objetos importantes
    - Fatos cruciais da trama ou narrativa
    - Regras do mundo/universo estabelecidas
    - Decisões narrativas chave
    - Instruções ou diretrizes importantes

    Seja extremamente conciso. Máximo de ${CHAT_CONFIG.summary.individualMaxWords} palavras.

    Mensagem original:
    ${messageContent}

    Resumo:
  `;
  }

  /**
   * Cria um resumo consolidado de múltiplas mensagens antigas
   */
  async createConsolidatedSummary(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const summaryModel = this.genAI.getGenerativeModel({
      model: CHAT_CONFIG.ai.model,
      safetySettings: CHAT_CONFIG.ai.safetySettings,
    });

    const conversationText = messages
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join("\n\n");

    const prompt = `
    Você é um assistente especializado em criar resumos consolidados de conversas longas.
    
    Sua tarefa é criar um resumo ESTRUTURADO e COMPLETO da conversa abaixo, preservando:
    
    **INFORMAÇÕES ESSENCIAIS:**
    - Todos os personagens mencionados (nomes, características, relações)
    - Todos os locais e ambientações descritos
    - Eventos principais da narrativa em ordem cronológica
    - Decisões narrativas importantes tomadas pelo autor
    - Regras do mundo/universo estabelecidas
    - Temas e conceitos centrais discutidos
    - Instruções ou diretrizes definidas pelo autor
    
    **FORMATO DO RESUMO:**
    Use uma estrutura clara com tópicos e subtópicos. Seja conciso mas completo.
    Máximo de ${CHAT_CONFIG.summary.consolidatedMaxWords} palavras.
    
    **CONVERSA ORIGINAL:**
    ${conversationText}
    
    **RESUMO CONSOLIDADO:**
  `;

    const result = await summaryModel.generateContent(prompt);
    return result.response.text().trim();
  }

  /**
   * Resume um bloco de mensagens (memória de médio prazo)
   */
  async createBlockSummary(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const summaryModel = this.genAI.getGenerativeModel({
      model: CHAT_CONFIG.ai.model,
      safetySettings: CHAT_CONFIG.ai.safetySettings,
    });

    const conversationText = messages
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join("\n\n");

    const prompt = `
    Resuma o seguinte bloco de conversa preservando:
    - Progressão da discussão/narrativa
    - Decisões e escolhas feitas
    - Informações importantes introduzidas
    - Contexto necessário para continuidade
    
    Seja detalhado o suficiente para manter continuidade, mas conciso.
    Máximo de ${CHAT_CONFIG.summary.blockMaxWords} palavras.
    
    **CONVERSA:**
    ${conversationText}
    
    **RESUMO DO BLOCO:**
  `;

    const result = await summaryModel.generateContent(prompt);
    return result.response.text().trim();
  }
}
