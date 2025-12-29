import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import logger from "@/lib/logger";
import type { ChatMessage, MessageMetadata } from "../components/types";

export interface ChatConfig {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  onSendMessage: (content: string, metadata?: MessageMetadata) => void;
  onStopGeneration: () => void;
}

interface UseChatProps {
  chatId: string;
  apiEndpoint: string;
}

export function useChat({ chatId, apiEndpoint }: UseChatProps): ChatConfig {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Ref to hold the current request controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!chatId || !apiEndpoint) return;

    setIsLoadingHistory(true);
    api
      .get<{ messages?: unknown[] }>(apiEndpoint)
      .then((data) => {
        if (data.messages) {
          const mappedMessages: ChatMessage[] = data.messages.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              shouldAnimate: false, // Don't animate historical messages
              suggestedPrompts: msg.suggestedPrompts,
              status: "saved",
            }),
          );
          setMessages(mappedMessages);
        }
      })
      .catch((err: unknown) =>
        logger.error({ err }, "Failed to load chat history"),
      )
      .finally(() => setIsLoadingHistory(false));
  }, [chatId, apiEndpoint]);

  const handleSendMessage = async (
    content: string,
    metadata?: MessageMetadata,
  ) => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Optimistic update
    const userMsg: ChatMessage = {
      id: nanoid(),
      content,
      role: "user",
      shouldAnimate: false,
      status: "pending",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await api.post<{
        message: string;
        messageId?: number;
        suggestedPrompts?: string[];
      }>(
        apiEndpoint,
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

      const aiMsg: ChatMessage = {
        id: data.messageId ? data.messageId.toString() : nanoid(),
        dbId: data.messageId,
        content: data.message,
        role: "model",
        shouldAnimate: true,
        suggestedPrompts: data.suggestedPrompts,
        status: data.messageId ? "saved" : "pending",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.info("Request canceled");

        // Adicionar mensagem de interrupção localmente
        // O backend já salvou ou está salvando - o reload sincronizará
        const interruptedMsg: ChatMessage = {
          id: nanoid(),
          content: "*Geração interrompida pelo usuário.*",
          role: "model",
          shouldAnimate: false,
          status: "saved", // Backend salvará, reload confirmará
        };
        setMessages((prev) => [...prev, interruptedMsg]);
      } else {
        logger.error({ error }, "Network error");
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

  return {
    messages,
    isLoading,
    isLoadingHistory,
    onSendMessage: handleSendMessage,
    onStopGeneration: handleStopGeneration,
  };
}
