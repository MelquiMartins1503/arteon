"use client";

import { useState } from "react";
import { Box } from "@/components/Box";
import { ChatProvider } from "../context/ChatContext";
import { ChatScrollProvider } from "../context/ChatScrollContext";
import { ChatHistoryLoading } from "./ChatHistoryLoading";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import type { ChatConfig } from "./types";

const Chat = ({
  messages,
  isLoading,
  isLoadingHistory,
  onSendMessage,
  welcomeMessage,
  avatarLabel,
  messageComponents,
  onPromptClick,
  onAnimationComplete,
  onStopGeneration,
  deleteMessage,
}: ChatConfig) => {
  const [_isInputValid, setIsInputValid] = useState(false);
  const CHAT_FORM_ID = "chat-form-input";

  return (
    <ChatProvider
      isLoading={isLoading}
      avatarLabel={avatarLabel}
      messageComponents={messageComponents}
      onPromptClick={onPromptClick}
      onAnimationComplete={onAnimationComplete}
      deleteMessage={deleteMessage}
    >
      <ChatScrollProvider messagesCount={messages.length}>
        <Box
          gap={0}
          flexDirection="col"
          alignItems="center"
          className="flex-1 w-full min-h-0"
        >
          {isLoadingHistory ? (
            <ChatHistoryLoading />
          ) : (
            <ChatMessages messages={messages} welcomeMessage={welcomeMessage} />
          )}

          <ChatInput
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            onStopGeneration={onStopGeneration}
            formId={CHAT_FORM_ID}
            onValidityChange={setIsInputValid}
          />
        </Box>
      </ChatScrollProvider>
    </ChatProvider>
  );
};

export { Chat };
