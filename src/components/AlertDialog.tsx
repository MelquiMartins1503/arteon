"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Box, type BoxProps } from "@/components/Box";
import { Button, type ButtonProps } from "@/components/Button";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";

// --- Context ---
interface AlertDialogContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(
  undefined,
);

const useAlertDialog = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error("useAlertDialog must be used within an AlertDialog");
  }
  return context;
};

// --- Slot Utility (for asChild) ---
const Slot = ({
  children,
  ...props
}: { children: ReactNode } & Record<string, any>) => {
  if (React.isValidElement(children)) {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic merging
    const childProps = (children.props as any) || {};

    const mergedProps = {
      ...props,
      ...childProps,
      className: cn(props.className, childProps.className),
      style: { ...props.style, ...childProps.style },
      onClick: (e: React.MouseEvent) => {
        if (props.onClick) props.onClick(e);
        if (childProps.onClick) childProps.onClick(e);
      },
    };

    return React.cloneElement(children, mergedProps);
  }
  return null;
};

// --- Components ---

const AlertDialogRoot = ({
  children,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = ({
  children,
  asChild,
  className,
  ...props
}: BoxProps & { asChild?: boolean }) => {
  const { setIsOpen } = useAlertDialog();

  const compProps = {
    className: cn("cursor-pointer", className),
    onClick: () => setIsOpen(true),
    ...props,
  };

  if (asChild) {
    return <Slot {...compProps}>{children}</Slot>;
  }

  return (
    <Box as="button" {...compProps}>
      {children}
    </Box>
  );
};

const AlertDialogContent = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const { isOpen, setIsOpen } = useAlertDialog();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, setIsOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Content */}
          <Box
            justifyContent="center"
            alignItems="center"
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                duration: 0.2,
                type: "spring",
                bounce: 0,
                damping: 25,
                stiffness: 300,
              }}
              className={cn(
                "flex flex-col gap-4",
                "pointer-events-auto",
                "w-lg max-[768px]:w-11/12 p-6 surface-brand-100",
                className,
              )}
            >
              {children}
            </motion.div>
          </Box>
        </React.Fragment>
      )}
    </AnimatePresence>,
    document.body,
  );
};

const AlertDialogHeader = ({ className, ...props }: BoxProps) => (
  <Box gap={0} flexDirection="col" className={className} {...props} />
);

const AlertDialogFooter = ({ className, ...props }: BoxProps) => (
  <Box
    gap={2}
    alignItems="center"
    justifyContent="start"
    className={cn("w-full", className)}
    {...props}
  />
);

const AlertDialogTitle = ({ className, children, ...props }: BoxProps) => (
  <Typography
    as="h2"
    size="2xl"
    weight="semibold"
    className={cn("", className)}
    {...props}
  >
    {children}
  </Typography>
);

const AlertDialogDescription = ({
  className,
  children,
  ...props
}: BoxProps) => (
  <Typography
    as="p"
    size="sm"
    className={cn("text-brand-600 dark:text-brand-500", className)}
    {...props}
  >
    {children}
  </Typography>
);

const AlertDialogAction = ({
  className,
  onClick,
  type,
  ...props
}: ButtonProps) => {
  const { setIsOpen } = useAlertDialog();
  return (
    <Button
      type={type}
      variant="default"
      className={className}
      onClick={(e: React.MouseEvent) => {
        if (onClick) onClick(e as any);
        // Não fecha automaticamente se for submit - deixa o form handler controlar
        if (type !== "submit") {
          setIsOpen(false);
        }
      }}
      {...props}
    />
  );
};

const AlertDialogCancel = ({ className, onClick, ...props }: ButtonProps) => {
  const { setIsOpen } = useAlertDialog();
  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={(e: React.MouseEvent) => {
        if (onClick) onClick(e as any);
        setIsOpen(false);
      }}
      {...props}
    />
  );
};

// Export as compound component using Object.assign pattern
const AlertDialog = Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Content: AlertDialogContent,
  Header: AlertDialogHeader,
  Footer: AlertDialogFooter,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
});

export { AlertDialog };
