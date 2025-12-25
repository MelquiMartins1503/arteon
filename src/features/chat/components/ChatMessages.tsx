"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Components } from "react-markdown";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";
import Typography from "@/components/ui/Typography";
import { cn } from "@/lib/cn";
import { ChatAvatar } from "./ChatAvatar";
import { ChatLoading } from "./ChatLoading";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "./types";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  welcomeMessage?: string;
  avatarLabel?: string;
  messageComponents?: {
    user?: Components;
    assistant?: Components;
  };
  onPromptClick?: (prompt: string) => void;
  onAnimationComplete?: (id: string) => void;
}

export const ChatMessages = ({
  messages,
  isLoading,
  welcomeMessage,
  avatarLabel,
  messageComponents,
  onPromptClick,
  onAnimationComplete,
}: ChatMessagesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Check if user is at the bottom of the scroll
  const checkIfAtBottom = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(!isAtBottom);
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    setIsUserScrolling(true);
    checkIfAtBottom();
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsUserScrolling(false);
      setShowScrollButton(false);
    }
  };

  // Auto-scroll to bottom when messages change (only if user isn't manually scrolling)
  useEffect(() => {
    if (scrollRef.current && !isUserScrolling && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isUserScrolling]);

  // Reset user scrolling flag after new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 relative w-full pr-8 overflow-y-auto min-h-0 scroll-smooth",
        "[scrollbar-width:thin]",
        "[scrollbar-color:#d8d8d8_transparent] dark:[scrollbar-color:#707070_transparent]",
        "[&::-webkit-scrollbar]:w-0",
        "[&::-webkit-scrollbar]:h-0",
      )}
    >
      <Box gap={6} flexDirection="col" className="w-full min-h-full">
        {welcomeMessage && (
          <Box alignItems="start" gap={3}>
            <ChatAvatar label={avatarLabel} />
            <Box flexDirection="col" className="max-w-[75%] pl-2">
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
              components={messageComponents}
              onPromptClick={onPromptClick}
              onAnimationComplete={onAnimationComplete}
            />
          );
        })}

        {isLoading && <ChatLoading avatarLabel={avatarLabel} />}
      </Box>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToBottom}
          className={cn(
            "absolute bottom-4 right-8 z-10 rounded-full shadow-lg",
            "transition-all duration-200",
          )}
        >
          <ArrowDown size={20} />
        </Button>
      )}
    </Box>
  );
};
