import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
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
  // Ref to prevent duplicate submissions
  const isSubmittingRef = useRef(false);

  /**
   * Deduplicate messages based on dbId or content+role
   * Prioritizes messages with dbId and 'saved' status
   */
  const deduplicateMessages = useCallback(
    (msgs: ChatMessage[]): ChatMessage[] => {
      const seen = new Map<string, ChatMessage>();

      for (const msg of msgs) {
        if (msg.dbId) {
          // Prioritize messages with dbId from server
          const key = `db-${msg.dbId}`;
          const existing = seen.get(key);
          if (!existing || msg.status === "saved") {
            seen.set(key, msg);
          }
        } else {
          // Fallback: use role + first 50 chars of content as key
          const contentKey = msg.content.substring(0, 50).trim();
          const key = `${msg.role}-${contentKey}`;
          if (!seen.has(key)) {
            seen.set(key, msg);
          }
        }
      }

      return Array.from(seen.values());
    },
    [],
  );

  /**
   * Refetch messages from server and deduplicate
   * Used for initial load and when user returns to page
   */
  const refetchMessages = useCallback(() => {
    if (!chatId || !apiEndpoint) return Promise.resolve();

    return api
      .get<{ messages?: unknown[] }>(apiEndpoint)
      .then((data) => {
        if (data.messages) {
          const mappedMessages: ChatMessage[] = data.messages.map(
            // biome-ignore lint/suspicious/noExplicitAny: incoming data is unknown
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
              imageUrls: msg.imageUrls || [],
              status: "saved",
            }),
          );
          const deduplicated = deduplicateMessages(mappedMessages);
          setMessages(deduplicated);
        }
      })
      .catch((err: unknown) =>
        logger.error({ err }, "Failed to load chat history"),
      );
  }, [chatId, apiEndpoint, deduplicateMessages]);

  // Fetch initial messages
  useEffect(() => {
    if (!chatId || !apiEndpoint) return;

    setIsLoadingHistory(true);
    refetchMessages().finally(() => setIsLoadingHistory(false));
  }, [chatId, apiEndpoint, refetchMessages]);

  // Page Visibility API: refetch messages when user returns to page
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refetch if page becomes visible and we're not currently loading
      if (document.visibilityState === "visible" && !isLoading) {
        refetchMessages();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetchMessages, isLoading]);

  const handleSendMessage = async (
    content: string,
    metadata?: MessageMetadata,
  ) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      logger.info("Submission already in progress, ignoring duplicate");
      return;
    }

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isSubmittingRef.current = true;

    // Optimistic update
    const userMsg: ChatMessage = {
      id: nanoid(),
      content,
      role: "user",
      shouldAnimate: false,
      imageUrls: metadata?.imageUrls || [],
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
          imageUrls: metadata?.imageUrls || [],
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
        // Status 'pending' será atualizado para 'saved' no próximo refetch
        const interruptedMsg: ChatMessage = {
          id: nanoid(),
          content: "*Geração interrompida pelo usuário.*",
          role: "model",
          shouldAnimate: false,
          status: "pending", // Será confirmado no próximo refetch do backend
        };
        setMessages((prev) => [...prev, interruptedMsg]);
      } else {
        logger.error({ error }, "Network error");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      isSubmittingRef.current = false;
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
