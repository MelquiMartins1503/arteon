import { Box } from "@/components/Box";
import { Typography } from "@/components/Typography";
import { useChatContext } from "@/features/chat/context/ChatContext";
import { ChatAvatar } from "./ChatMessage/ChatAvatar";

export const ChatLoading = () => {
  const { avatarLabel } = useChatContext();

  return (
    <Box alignItems="start" gap={3}>
      <ChatAvatar label={avatarLabel} />
      <Box>
        <Typography
          className="animate-pulse"
          role="status"
          aria-live="polite"
          aria-label="A IA está digitando uma resposta"
        >
          Digitando...
        </Typography>
      </Box>
    </Box>
  );
};
