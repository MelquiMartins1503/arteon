import { Check, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { AlertDialog } from "@/components/AlertDialog";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { useChatContext } from "../../context/ChatContext";

interface ChatMessageActionsProps {
  content: string;
  className?: string;
  variant?: "ghost" | "default";
  messageId?: string;
}

export const ChatMessageActions = ({
  content,
  className,
  messageId,
}: ChatMessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const { deleteMessage } = useChatContext();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (messageId && deleteMessage) {
      await deleteMessage(messageId);
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

      {messageId && deleteMessage && (
        <AlertDialog>
          <AlertDialog.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Excluir mensagem">
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Excluir mensagem?</AlertDialog.Title>
              <AlertDialog.Description>
                Esta ação excluirá esta resposta da IA e a sua mensagem
                anterior. Esta ação não pode ser desfeita.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
              <AlertDialog.Action onClick={handleDelete}>
                Excluir
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog>
      )}
    </Box>
  );
};
