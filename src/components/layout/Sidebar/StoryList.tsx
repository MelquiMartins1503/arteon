"use client";

import { AnimatePresence, Reorder } from "framer-motion";
import { Box } from "@/components/Box";
import { Typography } from "@/components/Typography";
import type { StorySidebarItem } from "@/features/story/actions";
import { updateStoriesOrder } from "@/features/story/actions";
import { StoryListItem } from "./StoryListItem";

interface StoryListProps {
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  isMobile?: boolean;
  onDeleteStory: (story: StorySidebarItem) => void;
  onEditStory: (story: { uuid: string }) => void;
}

export function StoryList({
  stories,
  setStories,
  isLoaded,
  isMobile = false,
  onDeleteStory,
  onEditStory,
}: StoryListProps) {
  return (
    <Box flexDirection="col" gap={2} className="h-full">
      <Typography
        as="span"
        weight="medium"
        whitespace="nowrap"
        className="pl-3.5 shrink-0"
      >
        Minhas Histórias
      </Typography>

      <Reorder.Group
        axis="y"
        values={stories}
        onReorder={(newOrder) => {
          setStories(newOrder);

          // Optimistic update done, now save to DB
          const orderUpdate = newOrder.map((s, index) => ({
            uuid: s.uuid,
            order: index,
          }));
          updateStoriesOrder(orderUpdate);
        }}
        className="flex overflow-y-auto flex-col flex-1"
      >
        <AnimatePresence initial={false}>
          {isLoaded &&
            stories.map((story) => (
              <Reorder.Item
                key={story.uuid}
                value={story}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1], // Material Design easing
                }}
                style={{ originY: 0 }} // Scale from top
              >
                <StoryListItem
                  story={story}
                  isMobile={isMobile}
                  onDelete={onDeleteStory}
                  onEdit={onEditStory}
                />
              </Reorder.Item>
            ))}
        </AnimatePresence>
      </Reorder.Group>
    </Box>
  );
}
