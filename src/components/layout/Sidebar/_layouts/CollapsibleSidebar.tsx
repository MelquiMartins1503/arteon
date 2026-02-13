"use client";

import { motion } from "framer-motion";
import { Box } from "@/components/Box";
import { Content } from "@/components/layout/Sidebar/_components/Content";
import type { StorySidebarItem } from "@/features/story/actions";

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  setStoryToEdit: (story: { uuid: string }) => void;
  setIsCreateStoryOpen: (open: boolean) => void;
}

export function CollapsibleSidebar({
  isCollapsed,
  setIsCollapsed,
  stories,
  setStories,
  isLoaded,
  setStoryToDelete,
  setStoryToEdit,
  setIsCreateStoryOpen,
}: CollapsibleSidebarProps) {
  return (
    <Box
      as={motion.div}
      className="hidden relative flex-none h-full bg-brand-150 dark:bg-brand-900 md:flex"
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 65 : 280 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={{ willChange: isCollapsed !== undefined ? "width" : "auto" }}
    >
      <Content
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        stories={stories}
        setStories={setStories}
        isLoaded={isLoaded}
        setStoryToDelete={setStoryToDelete}
        setStoryToEdit={setStoryToEdit}
        setIsCreateStoryOpen={setIsCreateStoryOpen}
      />
    </Box>
  );
}
