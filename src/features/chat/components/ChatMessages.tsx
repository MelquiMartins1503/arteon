import { ArrowDown } from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";
import { useChatContext } from "../context/ChatContext";
import { useChatScroll } from "../hooks/useChatScroll";
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
  const { isLoading, avatarLabel } = useChatContext();

  const { scrollRef, showScrollButton, handleScroll, scrollToBottom } =
    useChatScroll({
      messagesCount: messages.length,
    });

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "overflow-hidden overflow-y-auto flex-1 px-6 mb-3 w-10/12 max-[768px]:w-full min-h-0 scroll-smooth",
      )}
    >
      <Box gap={6} flexDirection="col" className="w-full min-h-full">
        {welcomeMessage && (
          <Box alignItems="start" flexDirection="col" gap={2}>
            <ChatAvatar label={avatarLabel} />
            <Box className="max-w-full">
              <Typography>{welcomeMessage}</Typography>
            </Box>
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

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          variant="outline"
          size="icon-lg"
          onClick={scrollToBottom}
          aria-label="Rolar para a última mensagem"
          className={cn(
            "absolute bottom-44 right-8 z-10 rounded-full shadow-lg",
            "transition-all duration-200",
          )}
        >
          <ArrowDown strokeWidth={1.5} />
        </Button>
      )}
    </Box>
  );
};
