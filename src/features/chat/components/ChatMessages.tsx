import { Box } from "@/components/Box";
import { ChatMessageContent } from "@/features/chat/components/ChatMessage/ChatMessageContent";
import { cn } from "@/lib/cn";
import { useChatContext } from "../context/ChatContext";
import { useChatScrollContext } from "../context/ChatScrollContext";
import { ChatLoading } from "./ChatLoading";
import { ChatMessage } from "./ChatMessage";
import { ChatAvatar } from "./ChatMessage/ChatAvatar";
import type { ChatMessage as ChatMessageType } from "./types";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  welcomeMessage?: string;
}

export const ChatMessages = ({
  messages,
  welcomeMessage,
}: ChatMessagesProps) => {
  const { isLoading, avatarLabel, messageComponents } = useChatContext();
  const { scrollRef, handleScroll } = useChatScrollContext();

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "overflow-hidden overflow-y-auto flex-1 px-6 mb-3 w-8/12 min-h-0 max-md:w-full scroll-smooth scrollbar-custom",
      )}
    >
      <Box gap={6} flexDirection="col" className="w-full min-h-full">
        {welcomeMessage && (
          <Box flexDirection="col" gap={2} className="pb-4">
            <ChatAvatar label={avatarLabel} />
            {typeof welcomeMessage === "string" ? (
              <ChatMessageContent
                content={welcomeMessage}
                components={messageComponents?.model}
              />
            ) : (
              // Renderizar diretamente se for ReactNode
              welcomeMessage
            )}
          </Box>
        )}

        {messages.map((msg, idx) => {
          const isLastMessage = idx === messages.length - 1;
          return (
            <ChatMessage
              key={msg.id || idx}
              message={{ ...msg, isLastMessage }}
            />
          );
        })}

        {isLoading && <ChatLoading />}
      </Box>
    </Box>
  );
};
