import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Components } from "react-markdown";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { ChatMessageContent } from "./ChatMessageContent";

interface ChatMessageCollapsibleProps {
  content: string;
  maxLines?: number;
  components?: Components;
}

export const ChatMessageCollapsible = ({
  content,
  maxLines = 6,
  components,
}: ChatMessageCollapsibleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      const { scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight > clientHeight) {
        setShowToggle(true);
      }
    }
  }, [content]);

  return (
    <Box flexDirection="col" className="relative w-full">
      <Box
        ref={containerRef}
        className={cn(
          "transition-all duration-200",
          !isExpanded && "overflow-hidden",
        )}
        style={{
          display: !isExpanded ? "-webkit-box" : "block",
          WebkitLineClamp: !isExpanded ? maxLines : "unset",
          WebkitBoxOrient: "vertical",
        }}
      >
        <ChatMessageContent content={content} components={components} />
      </Box>

      {showToggle && (
        <Button
          variant="ghost"
          size="md"
          width="md"
          className="absolute -top-1 -right-1 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
      )}
    </Box>
  );
};
