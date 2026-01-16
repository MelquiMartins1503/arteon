"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home, SquarePen } from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { iconAnimation } from "./SidebarHeader";

interface SidebarNavProps {
  isCollapsed?: boolean;
  onCreateStory: () => void;
}

export function SidebarNav({
  isCollapsed = false,
  onCreateStory,
}: SidebarNavProps) {
  return (
    <Box flexDirection="col" gap={0} className="w-full">
      <Button
        variant="ghost-secondary"
        href="/"
        leftIcon={
          <motion.div {...iconAnimation}>
            <Home size={22} strokeWidth={1.5} />
          </motion.div>
        }
        justifyContent="start"
        width="full"
        className="pl-3"
      >
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
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
              Início
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <Button
        variant="ghost-secondary"
        leftIcon={
          <motion.div {...iconAnimation}>
            <SquarePen size={22} strokeWidth={1.5} />
          </motion.div>
        }
        justifyContent="start"
        width="full"
        className="pl-3"
        onClick={onCreateStory}
      >
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
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
              Nova História
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </Box>
  );
}
