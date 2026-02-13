import { AnimatePresence, motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Box } from "@/components/Box";
import { Footer } from "@/components/layout/Sidebar/_components/Footer";
import { Header } from "@/components/layout/Sidebar/_components/Header";
import { Navigation } from "@/components/layout/Sidebar/_components/Navigation";
import { StoryList } from "@/components/layout/Sidebar/stories/StoryList";
import type { StorySidebarItem } from "@/features/story/actions";

interface ContentProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  setStoryToEdit: (story: { uuid: string }) => void;
  setIsCreateStoryOpen: (open: boolean) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Content({
  isCollapsed,
  setIsCollapsed,
  stories,
  setStories,
  isLoaded,
  setStoryToDelete,
  setStoryToEdit,
  setIsCreateStoryOpen,
  isMobile,
  onClose,
}: ContentProps) {
  return (
    <Box
      gap={0}
      alignItems="center"
      flexDirection="col"
      className="overflow-hidden p-2 w-full h-full"
    >
      <Header
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        onToggle={!isMobile ? () => setIsCollapsed(!isCollapsed) : undefined}
        onClose={onClose}
        ToggleIcon={isCollapsed ? ChevronsRight : ChevronsLeft}
      />

      <Navigation isCollapsed={isCollapsed} />

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
                onCreateStory={() => setIsCreateStoryOpen(true)}
                isCollapsed={isCollapsed}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <Footer isCollapsed={isCollapsed} />
    </Box>
  );
}
