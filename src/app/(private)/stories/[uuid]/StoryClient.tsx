"use client";

import { Chat } from "@/features/chat/components/Chat";
import { useStoryChat } from "@/features/story/hooks/useStoryChat";

interface StoryClientProps {
  uuid: string;
}

export function StoryClient({ uuid }: StoryClientProps) {
  const chatConfig = useStoryChat(uuid);

  return <Chat {...chatConfig} />;
}
