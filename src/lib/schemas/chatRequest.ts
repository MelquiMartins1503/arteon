import { z } from "zod";
import { CHAT_CONFIG } from "@/config/chat.config";

/**
 * Schema de validação para o body da requisição de chat
 */
export const chatRequestSchema = z.object({
  prompt: z
    .string()
    .min(CHAT_CONFIG.validation.minPromptLength, "O campo prompt é obrigatório")
    .max(
      CHAT_CONFIG.validation.maxPromptLength,
      `O prompt não pode exceder ${CHAT_CONFIG.validation.maxPromptLength} caracteres`,
    ),
  important: z.boolean().default(false),
  isMeta: z.boolean().default(false),
  generateSuggestions: z.boolean().default(false),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
