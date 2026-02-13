"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box } from "@/components/Box";
import { Content } from "@/components/layout/Sidebar/_components/Content";
import type { StorySidebarItem } from "@/features/story/actions";

interface DrawerSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  setStoryToEdit: (story: { uuid: string }) => void;
  setIsCreateStoryOpen: (open: boolean) => void;
}

export function DrawerSidebar({
  mobileOpen,
  setMobileOpen,
  stories,
  setStories,
  isLoaded,
  setStoryToDelete,
  setStoryToEdit,
  setIsCreateStoryOpen,
}: DrawerSidebarProps) {
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
            <Content
              isCollapsed={false}
              setIsCollapsed={() => setMobileOpen(false)}
              stories={stories}
              setStories={setStories}
              isLoaded={isLoaded}
              setStoryToDelete={setStoryToDelete}
              setStoryToEdit={setStoryToEdit}
              setIsCreateStoryOpen={setIsCreateStoryOpen}
              isMobile={true}
              onClose={() => setMobileOpen(false)}
            />
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
