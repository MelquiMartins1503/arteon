import React from "react";
import { ChatMessageModel } from "./ChatMessageModel";
import { ChatMessageUser } from "./ChatMessageUser";

interface ChatMessage {
  audioUrl?: string;
  id: string;
  dbId?: number;
  content: string;
  role: "user" | "model";
  shouldAnimate?: boolean;
  suggestedPrompts?: string[];
  isLastMessage?: boolean;
  status?: "pending" | "saved" | "error";
  imageUrls?: string[];
}

interface ChatMessageProps {
  message: ChatMessage;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <ChatMessageUser
        content={message.content}
        imageUrls={message.imageUrls}
      />
    );
  }

  return (
    <ChatMessageModel
      id={message.id}
      dbId={message.dbId}
      content={message.content}
      shouldAnimate={message.shouldAnimate}
      suggestedPrompts={message.suggestedPrompts}
      isLastMessage={message.isLastMessage}
      audioUrl={message.audioUrl}
    />
  );
};

export default React.memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.shouldAnimate === nextProps.message.shouldAnimate &&
    prevProps.message.isLastMessage === nextProps.message.isLastMessage
  );
});
