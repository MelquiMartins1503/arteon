"use client";

import axios, { type AxiosResponse } from "axios";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import type {
  ChatConfig,
  ChatMessageType,
  MessageMetadata,
} from "@/features/chat/components";
import apiClient from "@/lib/apiClient";

/**
 * Hook customizado para a funcionalidade de chat da história
 * Gerencia busca de mensagens, envio e estado para idealização da história
 */
export function useStoryChat(storyId: string): ChatConfig {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get<{
        messages?: unknown[];
        currentPhase?: string;
        developmentStage?: string;
      }>(`/stories/${storyId}/chat`)
      .then(
        (
          response: AxiosResponse<{
            messages?: unknown[];
            currentPhase?: string;
            developmentStage?: string;
          }>,
        ) => {
          const data = response.data;
          if (data.messages) {
            // Mapear mensagens da API para o formato ChatMessage
            const mappedMessages: ChatMessageType[] = data.messages.map(
              (msg: any) => ({
                id: typeof msg.id === "number" ? msg.id.toString() : msg.id,
                dbId:
                  typeof msg.dbId === "number"
                    ? msg.dbId
                    : typeof msg.id === "number"
                      ? msg.id
                      : undefined,
                content: msg.content,
                role: msg.role === "USER" ? "user" : "model",
                shouldAnimate: false, // Não animar mensagens históricas
                suggestedPrompts: msg.suggestedPrompts,
                audioUrl: msg.audioUrl,
                status: "saved", // Messages from DB are already saved
              }),
            );
            setMessages(mappedMessages);
          }
        },
      )
      .catch((err: unknown) =>
        console.error("Falha ao carregar histórico", err),
      );
  }, [storyId]);

  // Ref para guardar o controller da requisição atual
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = async (
    content: string,
    metadata?: MessageMetadata,
  ) => {
    // Abortar requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Use nanoid for temporary IDs (compatible with all systems)
    const userMsg: ChatMessageType = {
      id: nanoid(),
      content,
      role: "user",
      shouldAnimate: false,
      status: "pending", // Track that this message hasn't been saved yet
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await apiClient.post<{
        message: string;
        messageId?: number;
        suggestedPrompts?: string[];
      }>(
        `/stories/${storyId}/chat`,
        {
          prompt: content,
          important: metadata?.important || false,
          isMeta: metadata?.isMeta || false,
          generateSuggestions: metadata?.generateSuggestions || false,
        },
        {
          signal: controller.signal,
        },
      );

      const data = response.data;

      const aiMsg: ChatMessageType = {
        id: data.messageId ? data.messageId.toString() : nanoid(), // Use nanoid instead of timestamp
        dbId: data.messageId, // Store numeric DB ID
        content: data.message,
        role: "model",
        shouldAnimate: true, // Anima apenas na primeira vez
        suggestedPrompts: data.suggestedPrompts,
        status: data.messageId ? "saved" : "pending",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log("Request canceled");
        // Adicionar mensagem de feedback de interrupção
        const interruptedMsg: ChatMessageType = {
          id: nanoid(),
          content: "*Geração interrompida pelo usuário.*",
          role: "model",
          shouldAnimate: false,
          status: "error",
        };
        setMessages((prev) => [...prev, interruptedMsg]);
      } else {
        console.error("Network error:", error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleAnimationComplete = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, shouldAnimate: false } : msg,
      ),
    );
  };

  return {
    messages,
    isLoading,
    onSendMessage: handleSendMessage,
    onStopGeneration: handleStopGeneration,
    welcomeMessage:
      "Olá! Estamos na fase de idealização. Me conte sua ideia, gênero ou personagens principais para começarmos a estruturar sua história!",
    avatarLabel: "IA",

    onAnimationComplete: handleAnimationComplete,
    onPromptClick: (prompt: string) => handleSendMessage(prompt),
  };
}
