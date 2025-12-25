import { Box } from "@/components/ui/Box";
import Typography from "@/components/ui/Typography";
import { ChatAvatar } from "@/features/chat/components/ChatAvatar";

interface ChatLoadingProps {
  avatarLabel?: string;
}

export const ChatLoading = ({ avatarLabel }: ChatLoadingProps) => {
  return (
    <Box alignItems="start" gap={3}>
      <ChatAvatar label={avatarLabel} />
      <Box>
        <Typography className="animate-pulse">Digitando...</Typography>
      </Box>
    </Box>
  );
};
