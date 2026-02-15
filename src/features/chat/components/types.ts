import type { Components } from "react-markdown";

/**
 * Interface genérica de mensagens de bate-papo
 */
export interface ChatMessage {
  id: string; // React/UI ID (string for React keys)
  dbId?: number; // Database ID (numeric, for API calls)
  content: string;
  role: "user" | "model";
  shouldAnimate?: boolean;
  suggestedPrompts?: string[]; // Sugestões de acompanhamento da IA
  isLastMessage?: boolean; // Se é a última mensagem (para controlar botões)
  imageUrls?: string[]; // URLs das imagens anexadas

  status?: "pending" | "saved" | "error"; // Tracking state: pending (temp ID), saved (has dbId), error (failed)
}

/**
 * Metadados que podem ser anexados às mensagens
 */
export interface MessageMetadata {
  important?: boolean;
  isMeta?: boolean;
  generateSuggestions?: boolean;
  imageUrls?: string[];
  [key: string]: unknown;
}

/**
 * Configuração do sistema de chat
 */
export interface ChatConfig {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory?: boolean;
  onSendMessage: (content: string, metadata?: MessageMetadata) => void;
  welcomeMessage?: string;
  avatarLabel?: string;

  customInput?: React.ReactNode;
  messageComponents?: {
    user?: Components;
    model?: Components;
  };
  // Configuração de mensagem recolhível
  collapseUserMessages?: boolean;
  collapseModelMessages?: boolean;
  maxLinesBeforeCollapse?: number;
  // Configuração de sugestões de prompts
  onPromptClick?: (prompt: string) => void;
  showSuggestedPrompts?: boolean;
  // Controle de animação
  onAnimationComplete?: (id: string) => void;
  // Controle de requisição
  onStopGeneration?: () => void;
  // Controle de deleção
  deleteMessage?: (messageId: string) => Promise<void>;
}

/**
 * Props para entrada de chat com suporte a metadados
 */
export interface ChatInputProps {
  onSendMessage: (content: string, metadata?: MessageMetadata) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  formId?: string;
  onValidityChange?: (isValid: boolean) => void;
}

/**
 * Props para exibição de mensagem individual
 */
export interface ChatMessageProps {
  message: ChatMessage;
  components?: {
    user?: Components;
    model?: Components;
  };
  generateSuggestions?: boolean;
  onPromptClick?: (prompt: string) => void;
  onAnimationComplete?: (id: string) => void;
}
