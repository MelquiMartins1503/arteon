"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box } from "@/components/Box";
import type { StorySidebarItem } from "@/features/story/actions";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { StoryList } from "./StoryList";

interface MobileSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  setStoryToEdit: (story: { uuid: string }) => void;
  setIsCreateStoryOpen: (open: boolean) => void;
}

export function MobileSidebar({
  mobileOpen,
  setMobileOpen,
  stories,
  setStories,
  isLoaded,
  setStoryToDelete,
  setStoryToEdit,
  setIsCreateStoryOpen,
}: MobileSidebarProps) {
  return (
    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          key="mobile-nav"
          className="flex fixed inset-0 z-50"
          initial="closed"
          animate="open"
          exit="closed"
        >
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/25 md:hidden"
          />

          {/* Drawer */}
          <Box
            as={motion.div}
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed top-0 bottom-0 left-0 z-50 flex-col w-72 bg-brand-100 dark:bg-brand-925 border-r border-brand-300 dark:border-brand-800 md:hidden"
          >
            <Box
              className="overflow-hidden p-2 w-full h-full"
              flexDirection="col"
              gap={2}
            >
              {/* Header */}
              <SidebarHeader isMobile onClose={() => setMobileOpen(false)} />

              {/* Navigation */}
              <SidebarNav onCreateStory={() => setIsCreateStoryOpen(true)} />

              {/* Story List */}
              <Box flexDirection="col" className="overflow-hidden flex-1 mt-4">
                <AnimatePresence>
                  <Box flexDirection="col" gap={2} className="h-full">
                    <StoryList
                      stories={stories}
                      setStories={setStories}
                      isLoaded={isLoaded}
                      isMobile
                      onDeleteStory={setStoryToDelete}
                      onEditStory={setStoryToEdit}
                    />
                  </Box>
                </AnimatePresence>
              </Box>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
