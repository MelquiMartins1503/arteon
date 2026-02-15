import type { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIError } from "@google/generative-ai";
import { CHAT_CONFIG } from "@/config/chat.config";
import logger from "@/lib/logger";

/**
 * Cliente wrapper para o Gemini API com tratamento de erros e retry logic
 */
export class GeminiClient {
  constructor(_genAI: GoogleGenerativeAI) {}

  /**
   * Envia mensagem via stream com retry e tratamento de erros
   */
  async sendMessageStream(
    chat: any,
    prompt: string,
    abortSignal?: AbortSignal,
  ): Promise<{ text: string; interrupted: boolean }> {
    let attempt = 0;
    const { maxAttempts, initialDelay, backoffMultiplier } = CHAT_CONFIG.retry;

    while (attempt < maxAttempts) {
      // ✅ Verificar abort antes de cada tentativa
      if (abortSignal?.aborted) {
        logger.warn("Requisição abortada antes de iniciar tentativa");
        return { text: "", interrupted: true };
      }

      try {
        const result = await chat.sendMessageStream(prompt);
        let responseText = "";
        let wasInterrupted = false;

        for await (const chunk of result.stream) {
          // Verificar cancelamento
          if (abortSignal?.aborted) {
            logger.warn("Requisição abortada pelo cliente durante a geração");
            wasInterrupted = true;
            break;
          }

          const chunkText = chunk.text();
          responseText += chunkText;
        }

        return { text: responseText, interrupted: wasInterrupted };
      } catch (error) {
        attempt++;

        // ✅ Verificar abort logo após erro
        if (abortSignal?.aborted) {
          logger.warn("Requisição abortada durante tratamento de erro");
          return { text: "", interrupted: true };
        }

        // Tratamento específico de erros do Gemini
        if (error instanceof GoogleGenerativeAIError) {
          const errorMessage = error.message.toLowerCase();

          // Erros de quota/rate limit - fazer retry
          if (
            errorMessage.includes("quota") ||
            errorMessage.includes("rate limit")
          ) {
            if (attempt < maxAttempts) {
              const delay = initialDelay * backoffMultiplier ** (attempt - 1);
              logger.warn(
                { attempt, delay, error: errorMessage },
                "Rate limit/Quota excedido, tentando novamente",
              );
              // ✅ Sleep interruptível
              await this.sleepWithAbort(delay, abortSignal);

              // ✅ Verificar abort após sleep
              if (abortSignal?.aborted) {
                logger.warn("Requisição abortada durante backoff");
                return { text: "", interrupted: true };
              }

              continue;
            } else {
              throw new Error(
                "Limite de requisições excedido. Por favor, tente novamente em alguns minutos.",
              );
            }
          }

          // Erros de safety filters - não fazer retry
          if (errorMessage.includes("safety")) {
            throw new Error(
              "O conteúdo foi bloqueado pelos filtros de segurança. Por favor, reformule sua mensagem.",
            );
          }

          // Erros de API key - não fazer retry
          if (
            errorMessage.includes("api key") ||
            errorMessage.includes("authentication")
          ) {
            throw new Error(
              "Erro de autenticação com a API do Gemini. Verifique a configuração.",
            );
          }
        }

        // Erro genérico - fazer retry se ainda houver tentativas
        if (attempt < maxAttempts) {
          const delay = initialDelay * backoffMultiplier ** (attempt - 1);
          logger.warn(
            { attempt, delay, error },
            "Erro ao comunicar com Gemini, tentando novamente",
          );
          // ✅ Sleep interruptível
          await this.sleepWithAbort(delay, abortSignal);

          // ✅ Verificar abort após sleep
          if (abortSignal?.aborted) {
            logger.warn("Requisição abortada durante backoff");
            return { text: "", interrupted: true };
          }

          continue;
        }

        // Última tentativa falhou
        logger.error(
          { error, attempts: attempt },
          "Falha ao comunicar com Gemini após todas as tentativas",
        );
        throw error;
      }
    }

    throw new Error("Número máximo de tentativas atingido");
  }

  /**
   * Helper para sleep com Promise que pode ser interrompido por AbortSignal
   */
  private sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, ms);

      // Se signal abortar, cancelar timeout e resolver imediatamente
      const abortHandler = () => {
        clearTimeout(timeout);
        resolve();
      };

      signal?.addEventListener("abort", abortHandler, { once: true });
    });
  }
}
