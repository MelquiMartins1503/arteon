import { useState } from "react";
import { Box } from "@/components/Box";
import { useChatContext } from "@/features/chat/context/ChatContext";
import { cn } from "@/lib/cn";
import { ChatAvatar } from "./ChatAvatar";
import { ChatMessageActions } from "./ChatMessageActions";
import { ChatMessageContent } from "./ChatMessageContent";
import { ChatMessageSuggestedPrompts } from "./ChatMessageSuggestedPrompts";

interface ChatMessageModelProps {
  id: string; // React ID
  dbId?: number; // DB ID
  content: string;
  shouldAnimate?: boolean;
  suggestedPrompts?: string[];
  isLastMessage?: boolean;
}

export const ChatMessageModel = ({
  id,
  content,
  shouldAnimate,
  suggestedPrompts,
  isLastMessage,
}: ChatMessageModelProps) => {
  const { messageComponents, onPromptClick, onAnimationComplete } =
    useChatContext();
  const [showActions, setShowActions] = useState(!shouldAnimate);

  const handleTypewriterComplete = () => {
    setShowActions(true);
    if (onAnimationComplete) {
      onAnimationComplete(id);
    }
  };

  const shouldShowPrompts =
    showActions &&
    isLastMessage &&
    suggestedPrompts &&
    suggestedPrompts.length > 0 &&
    !!onPromptClick;

  // Não mostrar ações (copiar, áudio) para mensagens de interrupção
  const isInterruptedMessage =
    content === "*Geração interrompida pelo usuário.*";

  return (
    <Box
      alignItems="start"
      gap={2}
      className={cn("w-full flex-col group", isInterruptedMessage && "pb-4")}
    >
      <ChatAvatar />

      <Box flexDirection="col" className="max-w-full">
        <ChatMessageContent
          content={content}
          components={messageComponents?.model}
          shouldAnimate={shouldAnimate}
          onAnimationComplete={handleTypewriterComplete}
        />

        {/* Suggested Prompts */}
        {shouldShowPrompts && onPromptClick && suggestedPrompts && (
          <ChatMessageSuggestedPrompts
            prompts={suggestedPrompts}
            onPromptClick={onPromptClick}
          />
        )}

        {showActions && !isInterruptedMessage && (
          <ChatMessageActions content={content} messageId={id} />
        )}
      </Box>
    </Box>
  );
};
