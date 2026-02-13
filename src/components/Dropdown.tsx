"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Box, type BoxProps } from "@/components/Box";
import { cn } from "@/lib/cn";

// --- Dropdown Context ---
interface DropdownContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownContext = createContext<DropdownContextType | undefined>(
  undefined,
);

const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a Dropdown");
  }
  return context;
};

// --- Slot Component (Manual Implementation) ---
// biome-ignore lint/suspicious/noExplicitAny: Slot needs to accept any props for merging
type SlotProps = { children: ReactNode } & Record<string, any>;

// biome-ignore lint/suspicious/noExplicitAny: Need flexible ref type
const Slot = React.forwardRef<any, SlotProps>((props, ref) => {
  const { children, ...restProps } = props;
  if (React.isValidElement(children)) {
    // biome-ignore lint/suspicious/noExplicitAny: Need any for dynamic prop merging
    const childProps = (children.props as any) || {};

    const mergedProps = {
      ...restProps,
      ...childProps,
      ref,
      className: cn(restProps.className, childProps.className),
      style: { ...restProps.style, ...childProps.style },
      // Merge event handlers carefully
      onClick: (e: React.MouseEvent) => {
        if (restProps.onClick) restProps.onClick(e);
        if (childProps.onClick) childProps.onClick(e);
      },
    };

    return React.cloneElement(children, mergedProps);
  }
  return null;
});

// --- Dropdown Root ---
interface DropdownProps {
  children: ReactNode;
  className?: string; // Just in case, though usually not needed on root
  disableClickOutside?: boolean;
}

const DropdownRoot = ({
  children,
  className,
  disableClickOutside = false,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If disableClickOutside is true, we do NOT close
      if (disableClickOutside) return;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, close, disableClickOutside]);

  return (
    <DropdownContext.Provider value={{ isOpen, toggle, close, triggerRef }}>
      <Box ref={dropdownRef} className={cn("inline-block relative", className)}>
        {children}
      </Box>
    </DropdownContext.Provider>
  );
};

// --- Dropdown Trigger ---
interface DropdownTriggerProps extends Omit<BoxProps, "as"> {
  as?: ElementType;
  asChild?: boolean;
}

const DropdownTrigger = ({
  children,
  onClick,
  className,
  as,
  asChild,
  ...props
}: DropdownTriggerProps) => {
  const { toggle, isOpen, triggerRef } = useDropdown();

  const compProps = {
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      toggle();
      if (onClick) onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    },
    className: cn("cursor-pointer focus:outline-none", className),
    selected: isOpen,
    ...props,
  };

  if (asChild) {
    return (
      <Slot {...compProps} ref={triggerRef}>
        {children}
      </Slot>
    );
  }

  return (
    <Box as={as} {...compProps} ref={triggerRef}>
      {children}
    </Box>
  );
};

// --- Dropdown Content ---
interface DropdownContentProps extends HTMLMotionProps<"div"> {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "end" | "center";
  offset?: number;
}

const DropdownContent = ({
  children,
  className,
  side = "bottom",
  align = "start",
  offset = 4,
  ...props
}: DropdownContentProps) => {
  const { isOpen, triggerRef } = useDropdown();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate position based on trigger element
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const contentRect = contentRef.current?.getBoundingClientRect();

      if (!triggerRect) return;

      let top = 0;
      let left = 0;

      // Calculate based on side
      switch (side) {
        case "bottom":
          top = triggerRect.bottom + offset * 5;
          break;
        case "top":
          top = triggerRect.top - (contentRect?.height || 0) - offset * 5;
          break;
        case "left":
          left = triggerRect.left - (contentRect?.width || 0) - offset * 5;
          top = triggerRect.top;
          break;
        case "right":
          left = triggerRect.right + offset * 5;
          top = triggerRect.top;
          break;
      }

      // Calculate based on align (for top/bottom)
      if (side === "top" || side === "bottom") {
        switch (align) {
          case "start":
            left = triggerRect.left;
            break;
          case "center":
            left =
              triggerRect.left +
              triggerRect.width / 2 -
              (contentRect?.width || 0) / 2;
            break;
          case "end":
            left = triggerRect.right - (contentRect?.width || 0);
            break;
        }
      }

      // Calculate based on align (for left/right)
      if (side === "left" || side === "right") {
        switch (align) {
          case "start":
            top = triggerRect.top;
            break;
          case "center":
            top =
              triggerRect.top +
              triggerRect.height / 2 -
              (contentRect?.height || 0) / 2;
            break;
          case "end":
            top = triggerRect.bottom - (contentRect?.height || 0);
            break;
        }
      }

      setPosition({ top, left });
    };

    updatePosition();

    // Update on scroll and resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, side, align, triggerRef, offset]);

  // Animation variants based on side
  const motionVariants = {
    top: {
      initial: { opacity: 0, scale: 0.95, y: 5 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 5 },
    },
    bottom: {
      initial: { opacity: 0, scale: 0.95, y: -5 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: -5 },
    },
    left: {
      initial: { opacity: 0, scale: 0.95, x: 5 },
      animate: { opacity: 1, scale: 1, x: 0 },
      exit: { opacity: 0, scale: 0.95, x: 5 },
    },
    right: {
      initial: { opacity: 0, scale: 0.95, x: -5 },
      animate: { opacity: 1, scale: 1, x: 0 },
      exit: { opacity: 0, scale: 0.95, x: -5 },
    },
  };

  const { initial, animate, exit } = motionVariants[side];

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={contentRef}
          initial={initial}
          animate={animate}
          exit={exit}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "flex overflow-hidden fixed z-50 flex-col p-2 shadow-sm/5 min-w-32 bg-brand-100 dark:bg-brand-900 rounded-2xl border border-brand-200 dark:border-brand-800",
            className,
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render using portal to escape overflow-hidden
  if (typeof document !== "undefined") {
    return createPortal(dropdownContent, document.body);
  }

  return null;
};

// --- Dropdown Item ---
interface DropdownItemProps extends Omit<BoxProps, "as"> {
  as?: ElementType;
  inset?: boolean;
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  closeOnClick?: boolean; // Control whether dropdown closes on click
}

const DropdownItem = ({
  children,
  className,
  inset,
  onClick,
  as,
  asChild,
  leftIcon,
  rightIcon,
  closeOnClick = true, // Default to true for backward compatibility
  ...props
}: DropdownItemProps) => {
  const { close } = useDropdown();

  const compProps = {
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (onClick) onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      if (closeOnClick) {
        close(); // Only auto close if closeOnClick is true
      }
    },
    className: cn(
      "relative flex cursor-pointer select-none items-center rounded-xl p-2 text-sm outline-none transition-colors hover:bg-brand-200 focus:bg-brand-200 dark:hover:bg-brand-800 dark:focus:bg-brand-800",
      inset && "pl-8",
      className,
    ),
    ...props,
  };

  if (asChild) {
    return <Slot {...compProps}>{children}</Slot>;
  }

  return (
    <Box as={as || "div"} {...compProps}>
      {leftIcon}
      {children}
      {rightIcon}
    </Box>
  );
};

// --- Dropdown Label ---
interface DropdownLabelProps extends BoxProps {
  inset?: boolean;
}

const DropdownLabel = ({
  children,
  className,
  inset,
  ...props
}: DropdownLabelProps) => {
  return (
    <Box
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {children}
    </Box>
  );
};

// --- Dropdown Separator ---
const DropdownSeparator = ({ className, ...props }: BoxProps) => {
  return (
    <Box
      className={cn(
        "-mx-1 my-1 h-px bg-brand-200 dark:bg-brand-800",
        className,
      )}
      {...props}
    />
  );
};

// --- Dropdown Chevron ---
interface DropdownChevronProps {
  strokeWidth?: number;
}

const DropdownChevron = ({ strokeWidth = 1.5 }: DropdownChevronProps) => {
  const { isOpen } = useDropdown();

  return (
    <ChevronRight
      strokeWidth={strokeWidth}
      className={cn(
        "transform transition-all duration-200",
        isOpen && "-scale-x-100",
      )}
    />
  );
};

export { useDropdown };

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Label: DropdownLabel,
  Separator: DropdownSeparator,
  Chevron: DropdownChevron,
});
