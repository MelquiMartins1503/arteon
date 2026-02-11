import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";

interface ChatMessageActionsProps {
  content: string;
  className?: string;
  variant?: "ghost" | "default";
}

export const ChatMessageActions = ({
  content,
  className,
}: ChatMessageActionsProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box gap={1} className={className}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        aria-label={copied ? "Copiado" : "Copiar mensagem"}
      >
        {copied ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
      </Button>
    </Box>
  );
};
