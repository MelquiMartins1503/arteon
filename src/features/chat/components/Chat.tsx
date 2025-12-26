"use client";

import { useState } from "react";
import { Box } from "@/components/ui/Box";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import type { ChatConfig } from "./types";

const Chat = ({
  messages,
  isLoading,
  onSendMessage,
  welcomeMessage,
  avatarLabel,
  messageComponents,
  onPromptClick,
  onAnimationComplete,
  onStopGeneration,
}: ChatConfig) => {
  const [_isInputValid, setIsInputValid] = useState(false);
  const CHAT_FORM_ID = "chat-form-input";

  return (
    <Box gap={2} flexDirection="col" className="w-full h-full">
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        welcomeMessage={welcomeMessage}
        avatarLabel={avatarLabel}
        messageComponents={messageComponents}
        onPromptClick={onPromptClick}
        onAnimationComplete={onAnimationComplete}
      />

      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        onStopGeneration={onStopGeneration}
        formId={CHAT_FORM_ID}
        onValidityChange={setIsInputValid}
      />
    </Box>
  );
};

export { Chat };
