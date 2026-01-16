"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Box, type BoxProps } from "@/components/Box";
import { cn } from "@/lib/cn";

// --- Dropdown Context ---
interface DropdownContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
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
const Slot = ({
  children,
  ...props
}: { children: ReactNode } & Record<string, any>) => {
  if (React.isValidElement(children)) {
    // biome-ignore lint/suspicious/noExplicitAny: Need any for dynamic prop merging
    const childProps = (children.props as any) || {};

    const mergedProps = {
      ...props,
      ...childProps,
      className: cn(props.className, childProps.className),
      style: { ...props.style, ...childProps.style },
      // Merge event handlers carefully
      onClick: (e: React.MouseEvent) => {
        if (props.onClick) props.onClick(e);
        if (childProps.onClick) childProps.onClick(e);
      },
    };

    return React.cloneElement(children, mergedProps);
  }
  return null;
};

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
    <DropdownContext.Provider value={{ isOpen, toggle, close }}>
      <div ref={dropdownRef} className={cn("inline-block relative", className)}>
        {children}
      </div>
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
  const { toggle } = useDropdown();

  const compProps = {
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      toggle();
      if (onClick) onClick(e as any);
    },
    className: cn("cursor-pointer focus:outline-none", className),
    ...props,
  };

  if (asChild) {
    return <Slot {...compProps}>{children}</Slot>;
  }

  return (
    <Box as={as || "div"} {...compProps}>
      {children}
    </Box>
  );
};

// --- Dropdown Content ---
interface DropdownContentProps extends HTMLMotionProps<"div"> {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "end" | "center";
}

const DropdownContent = ({
  children,
  className,
  side = "bottom",
  align = "end",
  ...props
}: DropdownContentProps) => {
  const { isOpen } = useDropdown();

  // Position styles based on side
  const sideStyles = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  // Alignment styles based on side + align combination
  const alignStyles = {
    top: {
      start: "left-0",
      center: "left-1/2 -translate-x-1/2",
      end: "right-0",
    },
    bottom: {
      start: "left-0",
      center: "left-1/2 -translate-x-1/2",
      end: "right-0",
    },
    left: {
      start: "top-0",
      center: "top-1/2 -translate-y-1/2",
      end: "bottom-0",
    },
    right: {
      start: "top-0",
      center: "top-1/2 -translate-y-1/2",
      end: "bottom-0",
    },
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={initial}
          animate={animate}
          exit={exit}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "flex overflow-hidden absolute z-50 flex-col p-2 shadow-sm/5 min-w-32 surface-brand-100",
            sideStyles[side],
            alignStyles[side][align],
            className,
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
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
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (onClick) onClick(e as any);
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
        "-mx-1 my-1 h-px bg-neutral-100 dark:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
};

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Label: DropdownLabel,
  Separator: DropdownSeparator,
});
