import { Check, Copy, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { ChatAudioPlayer } from "./ChatAudioPlayer";

interface ChatMessageActionsProps {
  content: string;
  messageId?: string; // We need messageId for generation
  initialAudioUrl?: string | null;
  className?: string;
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
  const [showPlayer, setShowPlayer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAudioClick = async () => {
    setShowPlayer(true);

    // Se já tem audioUrl, não precisa gerar
    if (audioUrl) return;

    // Se já está gerando, não gere novamente
    if (isGenerating) return;

    if (!messageId) {
      toast.error("ID da mensagem não encontrado");
      return;
    }

    setIsGenerating(true);

    try {
      // Chamar API de geração (que agora salva no R2)
      const response = await fetch(`/api/stories/${params.uuid}/audio-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: Number(messageId) }),
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar áudio");
      }

      // Processar SSE para feedback
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Acumular chunk atual no buffer
          buffer += decoder.decode(value, { stream: true });

          // Processar linhas completas
          const lines = buffer.split("\n");

          // Manter o último fragmento incompleto no buffer
          // Se o último caractere era \n, o último elemento é "" (string vazia), o que é correto
          // Se não, o último elemento é o começo da próxima linha, que deve ficar no buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

            try {
              const data = JSON.parse(trimmedLine.slice(6));

              if (
                (data.type === "complete" || data.type === "cached") &&
                data.audioUrl
              ) {
                // Áudio foi gerado e salvo!
                setAudioUrl(data.audioUrl);
                setIsGenerating(false);
                toast.success(
                  data.type === "cached"
                    ? "Áudio carregado do cache!"
                    : "Áudio gerado com sucesso!",
                );
                break;
              }

              if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              console.warn("Erro ao parsear linha SSE:", e);
              // Ignorar linhas inválidas temporariamente para não quebrar o fluxo
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao gerar áudio:", error);
      toast.error("Erro ao gerar áudio");
      setIsGenerating(false);
      setShowPlayer(false);
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

      {messageId && (
        <Dropdown disableClickOutside={true}>
          <Dropdown.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAudioClick}
              aria-label={
                audioUrl ? "Reproduzir áudio" : "Gerar áudio com streaming"
              }
              className="hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <title>Ícone de áudio</title>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </Button>
          </Dropdown.Trigger>

          <Dropdown.Content
            align="start"
            side="top"
            className="w-auto p-2 pr-4"
          >
            {!showPlayer ? (
              <Box
                alignItems="center"
                justifyContent="center"
                className="py-2 px-4 text-xs text-brand-500"
              >
                Clique para ouvir
              </Box>
            ) : audioUrl ? (
              <ChatAudioPlayer audioUrl={audioUrl} />
            ) : (
              <Box
                alignItems="center"
                justifyContent="center"
                className="py-2 px-4 text-xs text-brand-500"
              >
                <Loader2 size={16} className="animate-spin mr-2" />
                Gerando áudio...
              </Box>
            )}
          </Dropdown.Content>
        </Dropdown>
      )}
    </Box>
  );
};
