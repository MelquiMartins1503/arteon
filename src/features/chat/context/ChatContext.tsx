import { createContext, useContext, useMemo } from "react";
import type { Components } from "react-markdown";

interface ChatContextValue {
  isLoading: boolean;
  avatarLabel?: string;
  messageComponents?: {
    user?: Components;
    model?: Components;
  };
  onPromptClick?: (prompt: string) => void;
  onAnimationComplete?: (id: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps extends ChatContextValue {
  children: React.ReactNode;
}

export const ChatProvider = ({
  children,
  isLoading,
  avatarLabel,
  messageComponents,
  onPromptClick,
  onAnimationComplete,
}: ChatProviderProps) => {
  const value = useMemo(
    () => ({
      isLoading,
      avatarLabel,
      messageComponents,
      onPromptClick,
      onAnimationComplete,
    }),
    [
      isLoading,
      avatarLabel,
      messageComponents,
      onPromptClick,
      onAnimationComplete,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
