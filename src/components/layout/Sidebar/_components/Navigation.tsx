"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home, Library } from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { iconAnimation } from "./Header";

interface NavigationProps {
  isCollapsed?: boolean;
}

export function Navigation({ isCollapsed = false }: NavigationProps) {
  return (
    <Box flexDirection="col" gap={0} className="w-full mb-4">
      <Button
        variant="ghost"
        href="/"
        leftIcon={
          <motion.div {...iconAnimation}>
            <Home size={22} strokeWidth={1.5} />
          </motion.div>
        }
        justifyContent="start"
        width="full"
        rounded="2xl"
        className={cn(
          "transform transition-transform",
          isCollapsed ? "pl-3.5" : "pl-3",
        )}
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
        variant="ghost"
        href="/"
        leftIcon={
          <motion.div {...iconAnimation}>
            <Library size={22} strokeWidth={1.5} />
          </motion.div>
        }
        justifyContent="start"
        width="full"
        rounded="2xl"
        className={cn(
          "transform transition-transform",
          isCollapsed ? "pl-3.5" : "pl-3",
        )}
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
              Biblioteca
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </Box>
  );
}
