"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";

export const iconAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring" as const, stiffness: 260, damping: 20 },
};

interface SidebarHeaderProps {
  isCollapsed?: boolean;
  isMobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  ToggleIcon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export function SidebarHeader({
  isCollapsed = false,
  isMobile = false,
  onToggle,
  onClose,
  ToggleIcon,
}: SidebarHeaderProps) {
  return (
    <Box
      alignItems="center"
      justifyContent="between"
      className={cn(
        "w-full",
        isMobile && "pl-3.5",
        !isMobile && !isCollapsed && "w-60",
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
                ease: [0.4, 0, 0.2, 1], // Material Design easing
              }}
              style={{ originX: 0 }} // Scale from left
              className="overflow-hidden text-xl font-medium whitespace-nowrap"
            >
              Arteon
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isMobile && (
        <Typography size="xl" weight="medium">
          Arteon
        </Typography>
      )}

      {(onToggle || onClose) && (
        <Button
          variant="ghost-secondary"
          size="icon-lg"
          onClick={onToggle || onClose}
          className="p-0"
        >
          {isMobile && onClose ? (
            <></>
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
