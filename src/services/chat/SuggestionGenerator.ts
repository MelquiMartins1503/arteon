import type { GoogleGenerativeAI } from "@google/generative-ai";
import { CHAT_CONFIG } from "@/config/chat.config";
import logger from "@/lib/logger";
import type { GeminiMessage } from "@/types/chat";

/**
 * Serviço para gerar sugestões de prompts para o usuário
 */
export class SuggestionGenerator {
  constructor(private genAI: GoogleGenerativeAI) {}

  /**
   * Gera sugestões de prompts baseadas no histórico e última resposta
   */
  async generateSuggestedPrompts(
    history: GeminiMessage[],
    lastResponse: string,
  ): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: CHAT_CONFIG.ai.model,
        safetySettings: CHAT_CONFIG.ai.safetySettings,
        generationConfig: {
          temperature: CHAT_CONFIG.ai.temperature,
          responseMimeType: "application/json",
        },
      });

      const prompt = this.buildPrompt(history, lastResponse);

      // Criar sessão de chat limpa para evitar erros de role
      const chat = model.startChat({ history: [] });
      const result = await chat.sendMessage(prompt);
      const text = result.response.text();

      return this.parseSuggestions(text);
    } catch (error) {
      logger.error({ error }, "Erro ao gerar sugestões (API)");
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Constrói o prompt para gerar sugestões
   */
  private buildPrompt(history: GeminiMessage[], lastResponse: string): string {
    return `
    Você é um assistente de idealização de histórias focado em profundidade e complexidade. Baseado no histórico, gere EXATAMENTE ${CHAT_CONFIG.ai.maxSuggestions} sugestões de prompts para o usuário aprofundar a história.
 
     REGRAS PARA O CONTEÚDO DAS SUGESTÕES:
     1. EXPLORATÓRIO: Não peça definições estáticas. Pergunte sobre CONSEQUÊNCIAS, DESDOBRAMENTOS e POSSIBILIDADES (ex: "O que acontece se...", "Como isso afeta...").
     2. CONEXÃO: Tente conectar o conceito novo com elementos antigos (ex: "Como essa ideia impacta o conflito central?").
     3. DINÂMICA: Foque em como a informação *se move* ou *age* na história, não apenas o que ela *é*.
 
     REGRAS DE ESTILO (Soberania do Autor):
     1. Use verbos de movimento/expansão: "Explore", "Expanda", "Conecte", "Questione", "Desdobre", "Imagine".
     2. EVITE: "Defina", "Explique", "Liste", "O que é".
     3. NUNCA sugira escrever cenas (ex: não use "Escreva a cena de...").
     4. Termine sem pontuação final.
     5. Mantenha curto (max 80 chars).
 
     Retorne APENAS o array JSON ["Sugestão 1", "Sugestão 2", "Sugestão 3"].
 
     Histórico recente: ${JSON.stringify(history.slice(-3))}
     Texto para analisar (foco principal): "${lastResponse.substring(0, 1000)}"
   `;
  }

  /**
   * Faz parse das sugestões retornadas pela API
   */
  private parseSuggestions(text: string): string[] {
    try {
      // Tentar extrair o array JSON usando regex
      const match = text.match(/\[[\s\S]*\]/);

      if (match) {
        const cleanedText = match[0];
        const parsed = JSON.parse(cleanedText);

        if (
          Array.isArray(parsed) &&
          parsed.every((s) => typeof s === "string")
        ) {
          return parsed.slice(0, CHAT_CONFIG.ai.maxSuggestions);
        }
      }

      logger.warn("Falha no parse de sugestões, usando fallback");
      return this.getFallbackSuggestions();
    } catch (error) {
      logger.error({ error }, "Erro ao fazer parse das sugestões");
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Retorna sugestões de fallback quando a API falha
   */
  private getFallbackSuggestions(): string[] {
    return ["Continuar", "Explorar mais", "Fazer uma pergunta"];
  }
}
