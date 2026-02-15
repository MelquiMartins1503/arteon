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
  const {
    messages,
    isLoading,
    isLoadingHistory,
    onSendMessage,
    onStopGeneration,
  } = useChat({
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
    isLoadingHistory,
    onSendMessage,
    onStopGeneration,
    welcomeMessage: `Olá! Bem-vindo à fase de **Idealização**.

Sou seu parceiro criativo nesta jornada. Vamos explorar juntos:
- Personagens complexos e multifacetados
- Ambientações ricas e imersivas
- Conflitos moralmente ambíguos
- Temas universais profundos

Compartilhe suas ideias iniciais, e vou ajudá-lo a desenvolvê-las com perguntas que aprofundam e expandem sua visão narrativa! Para encerrar a fase de idealização, basta digitar o comando **\`[FINALIZAR IDEALIZAÇÃO]\`**.

**Como podemos começar hoje?**`,
    avatarLabel: "IA",
    onAnimationComplete: handleAnimationComplete,
    onPromptClick: (prompt: string) => onSendMessage(prompt),
    messageComponents: {
      model: aiMarkdownComponents,
      user: userMarkdownComponents,
    },
  };
}
