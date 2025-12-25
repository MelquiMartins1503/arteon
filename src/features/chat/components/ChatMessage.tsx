import { Check, Copy } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";
import { Typewriter } from "@/components/ui/Typewriter";
import { cn } from "@/lib/cn";

import { ChatAvatar } from "./ChatAvatar";
import { ChatCollapsibleMessage } from "./ChatCollapsibleMessage";
import { ChatSuggestedPrompts } from "./ChatSuggestedPrompts";
import type { ChatMessageProps } from "./types";

export const ChatMessage = ({
  message,
  components,
  onPromptClick,
  onAnimationComplete,
}: ChatMessageProps) => {
  const params = useParams();
  const _storyId = params?.id as string;
  const isUser = message.role === "user";
  const userComponents = components?.user;
  const modelComponents = components?.model;
  const [copied, setCopied] = useState(false);

  // Se shouldAnimate é false, ações devem estar visíveis imediatamente
  // Se shouldAnimate é true, aguardar conclusão da animação
  const [showActions, setShowActions] = useState(!message.shouldAnimate);

  // Use _isDropdownOpeno_setIsDropdownOpen

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTypewriterComplete = () => {
    setShowActions(true);
    if (onAnimationComplete) {
      onAnimationComplete(message.id);
    }
  };

  // Mostrar prompts e botão apenas se:
  // - For mensagem da IA
  // - Animação terminou (showActions)
  // - É a última mensagem
  const shouldShowPrompts =
    !isUser &&
    showActions &&
    message.isLastMessage &&
    message.suggestedPrompts &&
    message.suggestedPrompts.length > 0 &&
    !!onPromptClick;

  return (
    <Box
      alignItems="start"
      gap={2}
      className={cn(
        "w-full group",
        isUser ? "flex-row-reverse items-start" : "flex-row",
      )}
    >
      {!isUser && <ChatAvatar />}

      {isUser && (
        <Box
          className={cn("group p-4 rounded-full max-w-full surface-brand-100")}
        >
          <ChatCollapsibleMessage
            content={message.content}
            maxLines={6}
            components={userComponents}
          />
        </Box>
      )}

      {!isUser && (
        <Box flexDirection="col" className={cn("max-w-full")}>
          {message.shouldAnimate ? (
            <Typewriter
              content={message.content}
              components={modelComponents}
              onComplete={handleTypewriterComplete}
            />
          ) : (
            <div className="pl-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={modelComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Sugestões de Prompts */}
          {shouldShowPrompts && message.suggestedPrompts && onPromptClick && (
            <ChatSuggestedPrompts
              prompts={message.suggestedPrompts}
              onPromptClick={onPromptClick}
            />
          )}

          {/* Actions (Copy & Audio) - Only show after animation */}
          {showActions && (
            <Box>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? "Copiado!" : "Copiar mensagem"}
                title={copied ? "Copiado!" : "Copiar mensagem"}
              >
                {copied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {isUser && (
        <Box
          className={cn(
            isUser && "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
        >
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </Box>
      )}
    </Box>
  );
};

// Memoize to prevent re-renders when parent updates (e.g., when typing in ChatInput)
// This keeps audio playing and dropdown open during unrelated state changes
export default React.memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.shouldAnimate === nextProps.message.shouldAnimate &&
    prevProps.message.isLastMessage === nextProps.message.isLastMessage
  );
});
