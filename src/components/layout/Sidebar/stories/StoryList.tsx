"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Plus } from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
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
  onCreateStory: () => void;
  isCollapsed?: boolean;
}

export function StoryList({
  stories,
  setStories,
  isLoaded,
  isMobile = false,
  onDeleteStory,
  onEditStory,
  onCreateStory,
  isCollapsed,
}: StoryListProps) {
  return (
    <Box flexDirection="col" gap={2} className="h-full">
      <Box alignItems="center" justifyContent="between" className="w-full">
        <Typography
          as="span"
          weight="medium"
          whitespace="nowrap"
          className="pl-3.5 shrink-0"
        >
          Histórias
        </Typography>

        <Button
          variant="ghost"
          justifyContent="center"
          size="icon-sm"
          rounded="lg"
          onClick={onCreateStory}
        >
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ originX: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <Plus size={20} strokeWidth={1.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </Box>

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
        className="flex overflow-y-auto flex-col flex-1 gap-1"
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
