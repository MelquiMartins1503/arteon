import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Typewriter } from "@/components/Typewriter";

interface ChatMessageContentProps {
  content: string;
  components?: Components;
  shouldAnimate?: boolean;
  onAnimationComplete?: () => void;
}

export const ChatMessageContent = memo(
  ({
    content,
    components,
    shouldAnimate,
    onAnimationComplete,
  }: ChatMessageContentProps) => {
    if (shouldAnimate) {
      return (
        <Typewriter
          content={content}
          components={components}
          onComplete={onAnimationComplete}
        />
      );
    }

    return (
      <div className="chat-message-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prev, next) => {
    // Só re-renderizar se estas props mudarem
    return (
      prev.content === next.content &&
      prev.shouldAnimate === next.shouldAnimate &&
      prev.components === next.components
    );
  },
);

ChatMessageContent.displayName = "ChatMessageContent";
