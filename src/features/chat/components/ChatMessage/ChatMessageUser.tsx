import { Box } from "@/components/Box";
import { useChatContext } from "../../context/ChatContext";
import { ChatMessageActions } from "./ChatMessageActions";
import { ChatMessageCollapsible } from "./ChatMessageCollapsible";

interface ChatMessageUserProps {
  content: string;
}

export const ChatMessageUser = ({ content }: ChatMessageUserProps) => {
  const { messageComponents } = useChatContext();

  return (
    <Box
      alignItems="start"
      gap={2}
      className="flex-row-reverse items-start w-full group"
    >
      <Box className="p-4 max-w-full rounded-4xl surface-brand-100">
        <ChatMessageCollapsible
          content={content}
          maxLines={6}
          components={messageComponents?.user}
        />
      </Box>

      <ChatMessageActions
        content={content}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Box>
  );
};
