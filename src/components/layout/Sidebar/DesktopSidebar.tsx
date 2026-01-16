"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Box } from "@/components/Box";
import type { StorySidebarItem } from "@/features/story/actions";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { StoryList } from "./StoryList";

interface DesktopSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  setStoryToEdit: (story: { uuid: string }) => void;
  setIsCreateStoryOpen: (open: boolean) => void;
}

export function DesktopSidebar({
  isCollapsed,
  setIsCollapsed,
  stories,
  setStories,
  isLoaded,
  setStoryToDelete,
  setStoryToEdit,
  setIsCreateStoryOpen,
}: DesktopSidebarProps) {
  return (
    <Box
      as={motion.div}
      className="hidden relative flex-none h-full bg-brand-100 dark:bg-brand-925 border-r border-brand-300 dark:border-brand-800 md:flex"
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 65 : 280 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1], // Material Design easing
      }}
      style={{ willChange: isCollapsed !== undefined ? "width" : "auto" }}
    >
      <Box
        className="overflow-hidden p-2 w-full h-full"
        flexDirection="col"
        alignItems="center"
        gap={2}
      >
        {/* Header */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          ToggleIcon={isCollapsed ? PanelLeftOpen : PanelLeftClose}
        />

        {/* Navigation */}
        <SidebarNav
          isCollapsed={isCollapsed}
          onCreateStory={() => setIsCreateStoryOpen(true)}
        />

        {/* Story List */}
        <Box flexDirection="col" className="overflow-hidden flex-1 mt-4 w-full">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.15,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="flex flex-col gap-2 h-full"
              >
                <StoryList
                  stories={stories}
                  setStories={setStories}
                  isLoaded={isLoaded}
                  onDeleteStory={setStoryToDelete}
                  onEditStory={setStoryToEdit}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
