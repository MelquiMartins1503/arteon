"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  createContext,
  type FC,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { FieldError } from "react-hook-form";
import { cn } from "@/lib/cn";

interface FieldContextType {
  error?: FieldError | undefined | { message: string };
  isPasswordVisible: boolean;
  togglePasswordVisibility: () => void;
  hasPasswordToggle: boolean;
  setHasPasswordToggle: (v: boolean) => void;
}

const FieldContext = createContext({} as FieldContextType);

const useField = () => useContext(FieldContext);

interface FieldProps {
  children: ReactNode;
  error?: FieldError | undefined;
}

const FieldProvider: FC<FieldProps> = ({ children, error }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [hasPasswordToggle, setHasPasswordToggle] = useState(false);

  return (
    <FieldContext.Provider
      value={{
        error,
        isPasswordVisible,
        togglePasswordVisibility: () => setIsPasswordVisible((prev) => !prev),
        hasPasswordToggle,
        setHasPasswordToggle,
      }}
    >
      {children}
    </FieldContext.Provider>
  );
};

const Root: FC<BoxProps> = ({
  children,
  flexDirection = "col",
  gap = 2,
  className,
  ...boxProps
}) => (
  <Box
    flexDirection={flexDirection}
    gap={gap}
    className={cn("relative w-full", className)}
    {...boxProps}
  >
    {children}
  </Box>
);

const Label: FC<Omit<TypographyProps<"label">, "as">> = ({
  children,
  className,
  ...props
}) => (
  <Typography
    as="label"
    size="base"
    className={cn("mb-1 text-brand-975 dark:text-brand-50", className)}
    {...props}
  >
    {children}
  </Typography>
);

const InputWrapper: FC<BoxProps> = ({
  children,
  className,
  alignItems = "center",
  ...boxProps
}) => (
  <Box
    alignItems={alignItems}
    className={cn("relative w-full h-14 rounded-xl", className)}
    {...boxProps}
  >
    {children}
  </Box>
);

const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  const { isPasswordVisible, error, hasPasswordToggle } = useField();

  const inputType =
    type === "password" ? (isPasswordVisible ? "text" : "password") : type;

  return (
    <input
      ref={ref}
      type={inputType}
      className={cn(
        "flex-1 h-full px-4 rounded-2xl outline-none transition-colors",
        "text-brand-975 dark:text-brand-50 placeholder:text-brand-600 dark:placeholder:text-brand-600",
        "surface-brand-100 surface-brand-100-hover surface-brand-100-focus",
        error && "border-red-500! focus:border-red-500 dark:border-red-500",
        hasPasswordToggle && "pr-10",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Field.Input";

const Group: FC<BoxProps> = ({
  children,
  alignItems = "center",
  justifyContent = "between",
  className,
  ...boxProps
}) => (
  <Box
    alignItems={alignItems}
    justifyContent={justifyContent}
    className={cn("w-full", className)}
    {...boxProps}
  >
    {children}
  </Box>
);

const ErrorMessage: FC<BoxProps> = ({ children, className, ...boxProps }) => {
  const { error } = useField();

  const content = error?.message || children;
  if (!content) return null;

  return (
    <Typography
      as="span"
      size="sm"
      className={cn("text-red-500", className)}
      {...boxProps}
    >
      {content}
    </Typography>
  );
};

import { useEffect } from "react";

const PasswordToggleButton: FC<BoxProps<"button">> = ({
  className,
  alignItems = "center",
  justifyContent = "center",
  ...boxProps
}) => {
  const { isPasswordVisible, togglePasswordVisibility, setHasPasswordToggle } =
    useField();

  useEffect(() => {
    setHasPasswordToggle(true);
    return () => setHasPasswordToggle(false);
  }, [setHasPasswordToggle]);

  return (
    <Box
      as="button"
      type="button"
      alignItems={alignItems}
      justifyContent={justifyContent}
      onClick={togglePasswordVisibility}
      className={cn(
        "absolute right-4 transition-colors cursor-pointer text-brand-700 dark:text-brand-600 hover:text-brand-975 dark:hover:text-brand-50",
        className,
      )}
      {...boxProps}
    >
      {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
    </Box>
  );
};

// TextArea Context for composable TextArea components
import { Maximize2, Minimize2 } from "lucide-react";
import { Box, type BoxProps } from "./Box";
import { Button } from "./Button";
import { Typography, type TypographyProps } from "./Typography";

interface TextAreaContextType {
  content: string;
  setContent: (content: string) => void;
  maxCharacters?: number;
  minRows: number;
  maxRows?: number;
  expandedMaxRows?: number;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  hasOverflow: boolean;
  setHasOverflow: (overflow: boolean) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  expandButtonPosition: "inside" | "outside";
  variant: "default" | "minimal";
  counterPosition: "inside" | "below";
}

const TextAreaContext = createContext<TextAreaContextType | null>(null);

const useTextArea = () => {
  const context = useContext(TextAreaContext);
  if (!context) {
    throw new Error("TextArea components must be used within TextAreaWrapper");
  }
  return context;
};

const TextAreaWrapper: FC<
  BoxProps & {
    maxCharacters?: number;
    minRows?: number;
    maxRows?: number;
    expandedMaxRows?: number;
    expandButtonPosition?: "inside" | "outside";
    variant?: "default" | "minimal";
    counterPosition?: "inside" | "below";
  }
> = ({
  children,
  className,
  flexDirection = "col",
  maxCharacters,
  minRows = 3,
  maxRows,
  expandedMaxRows,
  expandButtonPosition = "inside",
  variant = "default",
  counterPosition = "inside",
  ...boxProps
}) => {
  const { error } = useField();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <TextAreaContext.Provider
      value={{
        content: textAreaRef.current?.value || "", // Use valor do DOM ao invés de estado
        setContent: () => {}, // Função vazia, não precisa mais
        maxCharacters,
        minRows,
        maxRows,
        expandedMaxRows,
        isExpanded,
        setIsExpanded,
        hasOverflow,
        setHasOverflow,
        textAreaRef,
        expandButtonPosition,
        variant,
        counterPosition,
      }}
    >
      <Box
        flexDirection={flexDirection}
        className={cn(
          "w-full transition-colors",
          variant === "default" && [
            "relative p-3 rounded-3xl",
            "surface-brand-100 surface-brand-100-hover surface-brand-100-focus",
            error && "border-red-500! dark:border-red-500!",
          ],
          variant === "minimal" && [
            "group-hover:bg-brand-50 dark:group-hover:bg-brand-950",
          ],
          className,
        )}
        gap={1}
        {...boxProps}
      >
        {children}
      </Box>
    </TextAreaContext.Provider>
  );
};

const TextAreaInput = forwardRef<
  HTMLTextAreaElement,
  InputHTMLAttributes<HTMLTextAreaElement>
>(({ className, onChange, value, style, ...props }, ref) => {
  const {
    maxCharacters,
    minRows,
    maxRows,
    expandedMaxRows,
    isExpanded,
    setIsExpanded,
    setHasOverflow,
    textAreaRef,
    expandButtonPosition,
  } = useTextArea();

  // biome-ignore lint/correctness/useExhaustiveDependencies: adjustHeight is stable but not in deps for performance
  const adjustHeight = useCallback(
    (el: HTMLTextAreaElement) => {
      el.style.height = "auto";
      const newHeight = el.scrollHeight;
      el.style.height = `${newHeight}px`;

      // Check if content overflows maxRows
      if (maxRows) {
        const lineHeight = 24; // Approximate line height in pixels
        const maxHeight = maxRows * lineHeight;
        const hasOverflowNow = newHeight > maxHeight;
        setHasOverflow(hasOverflowNow);

        setHasOverflow(hasOverflowNow);
      }
    },
    [maxRows, setHasOverflow, isExpanded, setIsExpanded],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue === "") setIsExpanded(false);
    if (onChange) onChange(e);
    adjustHeight(e.target);
  };

  const handleRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textAreaRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          node;

      if (node) {
        adjustHeight(node);
      }
    },
    [ref, textAreaRef, adjustHeight],
  );

  // Adjust height on initial mount and value changes
  useLayoutEffect(() => {
    const currentRef = textAreaRef.current;
    if (currentRef) {
      // Se o valor estiver vazio, resetar para altura mínima
      if (!value || value === "") {
        currentRef.style.height = "auto";
        setIsExpanded(false);
        setHasOverflow(false);
      } else {
        adjustHeight(currentRef);
      }
    }
  }, [adjustHeight, textAreaRef, value, setIsExpanded, setHasOverflow]);

  // Calculate height constraints based on expanded state
  const calculateMinHeight = () => {
    return `${minRows * 1.5}rem`;
  };

  const calculateMaxHeight = () => {
    if (isExpanded) {
      return expandedMaxRows ? `${expandedMaxRows * 1.5}rem` : "none";
    }
    return maxRows ? `${maxRows * 1.5}rem` : undefined;
  };

  return (
    <textarea
      ref={handleRef}
      rows={minRows}
      maxLength={maxCharacters}
      onChange={handleChange}
      value={value}
      style={{
        ...style,
        minHeight: calculateMinHeight(),
        maxHeight: calculateMaxHeight(),
      }}
      className={cn(
        "w-full bg-transparent outline-none resize-none overflow-auto transition-all duration-200 ease-in-out",
        "text-brand-900 dark:text-brand-50 placeholder:text-brand-600 dark:placeholder:text-brand-600",
        expandButtonPosition === "inside" && "pr-0",
        className,
      )}
      {...props}
    />
  );
});

TextAreaInput.displayName = "Field.TextAreaInput";

const TextAreaCounter: FC<BoxProps> = ({ className, ...boxProps }) => {
  const { content, maxCharacters, counterPosition } = useTextArea();

  if (!maxCharacters) return null;

  return (
    <Typography
      as="span"
      size="xs"
      className={cn(
        "text-brand-500 dark:text-brand-700",
        counterPosition === "inside" && "text-right",
        counterPosition === "below" && "absolute -bottom-8 right-0",
        className,
      )}
      {...boxProps}
    >
      {content.length}/{maxCharacters}
    </Typography>
  );
};

const TextAreaExpandButton: FC<BoxProps<"button">> = ({
  className,
  alignItems,
  justifyContent,
  gap,
  ...boxProps
}) => {
  const { isExpanded, setIsExpanded, hasOverflow, expandButtonPosition } =
    useTextArea();

  if (!hasOverflow) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      alignItems={alignItems ?? "center"}
      justifyContent={
        (justifyContent === "normal" ? "center" : justifyContent) ?? "center"
      }
      gap={gap ?? undefined}
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "absolute rounded-full",
        expandButtonPosition === "inside"
          ? "top-1.5 right-1.5"
          : "top-1.5 -right-12",
        className,
      )}
      {...boxProps}
    >
      {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </Button>
  );
};

const Field = Object.assign(FieldProvider, {
  Root,
  Label,
  InputWrapper,
  Input,
  Group,
  ErrorMessage,
  PasswordToggleButton,
  TextAreaWrapper,
  TextAreaInput,
  TextAreaCounter,
  TextAreaExpandButton,
});

export default Field;
