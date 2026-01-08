/**
 * Types centralizados para o sistema de chat
 */

/**
 * Papel (role) de uma mensagem no chat
 */
export type ChatRole = "USER" | "MODEL";

/**
 * Formato de papel usado pelo Gemini API
 */
export type GeminiRole = "user" | "model";

/**
 * Mensagem armazenada no banco de dados
 */
export interface ChatMessage {
  id: number;
  content: string;
  role: ChatRole;
  important: boolean;
  isMeta: boolean;
  summary: string | null;
  createdAt?: Date;
  conversationHistoryId?: number;
}

/**
 * Parte de uma mensagem no formato do Gemini
 */
export interface GeminiMessagePart {
  text: string;
}

/**
 * Mensagem no formato do Gemini API
 */
export interface GeminiMessage {
  role: GeminiRole;
  parts: GeminiMessagePart[];
}

/**
 * Entrada para criação de mensagem de chat
 */
export interface ChatMessageInput {
  prompt: string;
  important?: boolean;
  isMeta?: boolean;
  generateSuggestions?: boolean;
}

/**
 * Resposta da API de chat
 */
export interface ChatResponse {
  message: string;
  messageId?: number;
  suggestedPrompts: string[];
}

/**
 * Tipo de resumo de memória
 */
export type SummaryType = "CONSOLIDATED" | "BLOCK" | "INDIVIDUAL";

/**
 * Registro de resumo
 */
export interface SummaryRecord {
  type: SummaryType;
  content: string;
  messageIds: number[];
}

/**
 * Configuração de retry
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  backoffMultiplier: number;
}

/**
 * Resultado de operação com retry
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Informações de histórico otimizado
 */
export interface OptimizedHistoryInfo {
  totalMessages: number;
  oldMessages: number;
  recentMessages: number;
  hasConsolidatedSummary: boolean;
  midTermBlocks: number;
  finalHistorySize: number;
}
