"use client";

import { Chat } from "@/features/chat/components";
import { aiMarkdownComponents } from "@/features/chat/markdown/aiMarkdownComponents";
import { userMarkdownComponents } from "@/features/chat/markdown/userMarkdownComponents";
import { useStoryChat } from "@/features/story/hooks/useStoryChat";

interface StoryChatProps {
  storyId: string;
}

export const StoryChat: React.FC<StoryChatProps> = ({ storyId }) => {
  return (
    <Chat
      {...useStoryChat(storyId)}
      messageComponents={{
        user: userMarkdownComponents,
        model: aiMarkdownComponents,
      }}
    />
  );
};
