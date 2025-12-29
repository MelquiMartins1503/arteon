"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

interface TypewriterProps {
  content: string;
  components?: Components;
  onComplete?: () => void;
  speed?: number;
  className?: string;
}

export const Typewriter = ({
  content,
  components,
  onComplete,
  speed = 2,
  className,
}: TypewriterProps) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Usar ref para evitar reinicialização quando onComplete muda
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const startTime = Date.now();
    let intervalId: NodeJS.Timeout;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const charsToShow = Math.floor(elapsed / speed);

      if (charsToShow >= content.length) {
        setDisplayedContent(content);
        setIsTyping(false);
        clearInterval(intervalId);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      } else {
        setDisplayedContent(content.slice(0, charsToShow));
      }
    };

    // 20ms = 50fps, smooth enough. Logic handles speed accuracy.
    intervalId = setInterval(tick, 20);
    tick();

    return () => {
      clearInterval(intervalId);
    };
  }, [content, speed]); // Remover onComplete das dependências

  return (
    <div className={cn("pl-2", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {displayedContent + (isTyping ? "▍" : "")}
      </ReactMarkdown>
    </div>
  );
};
