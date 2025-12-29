"use client";

import type { ChatConfig } from "@/features/chat/components/types";
import { useChat } from "@/features/chat/hooks/useChat";

import { aiMarkdownComponents } from "@/features/chat/markdown/aiMarkdownComponents";
import { userMarkdownComponents } from "@/features/chat/markdown/userMarkdownComponents";

/**
 * Hook customizado para a funcionalidade de chat da história
 * Configura o useChat para o endpoint específ ico de histórias
 */
export function useStoryChat(storyUuid: string): ChatConfig {
  const { messages, isLoading, onSendMessage, onStopGeneration } = useChat({
    chatId: storyUuid,
    apiEndpoint: `/stories/${storyUuid}/chat`,
  });

  const handleAnimationComplete = (_id: string) => {
    // A animação é controlada via shouldAnimate no useChat,
    // mas se precisarmos de lógica extra local, pode ser adicionada aqui.
    // Por enquanto, o useChat já lida com o estado global se necessário,
    // ou apenas deixamos o componente UI lidar com isso visualmente.
  };

  return {
    messages,
    isLoading,
    onSendMessage,
    onStopGeneration,
    welcomeMessage:
      "Olá! Estamos na fase de idealização. Me conte sua ideia, gênero ou personagens principais para começarmos a estruturar sua história!",
    avatarLabel: "IA",
    onAnimationComplete: handleAnimationComplete,
    onPromptClick: (prompt: string) => onSendMessage(prompt),
    messageComponents: {
      model: aiMarkdownComponents,
      user: userMarkdownComponents,
    },
  };
}
