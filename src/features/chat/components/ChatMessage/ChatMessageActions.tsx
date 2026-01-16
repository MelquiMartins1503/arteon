import { Check, Copy } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
// import { Dropdown } from "@/components/Dropdown";
import { api } from "@/lib/api";
import logger from "@/lib/logger";

// import { ChatAudioPlayer } from "./ChatAudioPlayer";

interface ChatMessageActionsProps {
  content: string;
  messageId?: string; // We need messageId for generation
  initialAudioUrl?: string | null;
  className?: string; // Keep if needed, though not used in new code it prevents prop mismatch if passed
  variant?: "ghost" | "default";
}

export const ChatMessageActions = ({
  content,
  messageId,
  initialAudioUrl,
  className,
}: ChatMessageActionsProps) => {
  const params = useParams();
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(
    initialAudioUrl || null,
  );
  const [_isGenerating, setIsGenerating] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const _handleGenerateOrPlay = async () => {
    // Se já tem URL, apenas foca no dropdown/player (lógica visual)
    if (audioUrl) return;

    if (!messageId) return;

    setIsGenerating(true);
    try {
      const response = await api.post<{ audioUrl: string }>(
        `/stories/${params.uuid}/audio`,
        { messageId: Number(messageId) },
      );
      setAudioUrl(response.audioUrl);
    } catch (error) {
      logger.error(
        { error, messageId, storyId: params.uuid },
        "Failed to generate audio",
      );
      toast.error("Erro ao gerar áudio", {
        description: "Falha na comunicação com o Gemini. Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
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

      {/*
      {messageId && (
        <Dropdown disableClickOutside={true}>
          <Dropdown.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGenerateOrPlay}
              disabled={isGenerating}
              aria-label={audioUrl ? "Reproduzir áudio" : "Gerar áudio"}
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Volume2 size={16} aria-hidden="true" />
              )}
            </Button>
          </Dropdown.Trigger>

          <Dropdown.Content
            align="start"
            side="top"
            className="w-auto p-2 pr-4"
          >
            {!audioUrl ? (
              <Box
                alignItems="center"
                justifyContent="center"
                className="py-2 px-4 text-xs text-brand-500"
              >
                {isGenerating ? "Gerando áudio..." : "Clique para gerar"}
              </Box>
            ) : (
              <ChatAudioPlayer audioUrl={audioUrl} />
            )}
          </Dropdown.Content>
        </Dropdown>
      )}
      */}
    </Box>
  );
};
