"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";

export const iconAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring" as const, stiffness: 260, damping: 20 },
};

interface HeaderProps {
  isCollapsed?: boolean;
  isMobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  ToggleIcon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export function Header({
  isCollapsed = false,
  isMobile = false,
  onToggle,
  onClose,
  ToggleIcon,
}: HeaderProps) {
  return (
    <Box
      alignItems="center"
      justifyContent="between"
      className={cn(
        "w-full",
        isMobile && "pl-3.5",
        !isMobile && "min-h-[74px]",
      )}
    >
      {!isMobile && (
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{
                duration: 0.15,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{ originX: 0 }}
              className="overflow-hidden text-2xl font-medium whitespace-nowrap pl-3.5"
            >
              Arteon
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isMobile && (
        <Typography size="2xl" weight="medium">
          Arteon
        </Typography>
      )}

      {(onToggle || onClose) && (
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={onToggle || onClose}
          rounded="2xl"
          className="p-0"
        >
          {isMobile && onClose ? (
            <motion.div {...iconAnimation}>
              <X size={24} strokeWidth={1.5} />
            </motion.div>
          ) : (
            ToggleIcon && (
              <motion.div
                key={isCollapsed ? "open" : "close"}
                {...iconAnimation}
              >
                <ToggleIcon size={24} strokeWidth={1.5} />
              </motion.div>
            )
          )}
        </Button>
      )}
    </Box>
  );
}
