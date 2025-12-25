"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BoxProps } from "./Box";

export const buttonVariants = cva(
  "p-4 transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400",
  {
    variants: {
      variant: {
        default:
          "text-brand-50 dark:text-brand-975 bg-brand-975 dark:bg-brand-50 hover:opacity-90 font-medium",
        outline:
          "border bg-brand-100 dark:bg-brand-990 hover:bg-brand-50 dark:hover:bg-brand-950 border-brand-300 dark:border-brand-900 text-brand-700 dark:text-brand-600 hover:text-brand-975 dark:hover:text-brand-50",
        ghost:
          "text-brand-800 dark:text-brand-600 hover:text-brand-975 dark:hover:text-brand-50 hover:bg-brand-200 dark:hover:bg-brand-925",
        primary:
          "text-brand-975 dark:text-brand-50 bg-brand-300 dark:bg-brand-950 hover:bg-brand-200 dark:hover:bg-brand-900",
      },
      size: {
        xs: "h-8 text-xs gap-1",
        sm: "h-10 text-sm gap-1.5",
        md: "h-12! text-base gap-2",
        lg: "h-14 text-lg gap-2",
        xl: "h-16 text-xl gap-3",
        icon: "h-10 w-10! p-0",
        "icon-sm": "h-8 w-8! p-0",
        "icon-lg": "h-12 w-12! p-0",
      },
      width: {
        auto: "w-auto",
        fit: "w-fit",
        full: "w-full",
        xs: "min-w-8 max-w-8",
        sm: "min-w-10 max-w-10",
        md: "min-w-12 max-w-12",
        lg: "min-w-14 max-w-14",
        xl: "min-w-16 max-w-16",
        "1/2": "w-1/2",
        "1/3": "w-1/3",
        "2/3": "w-2/3",
        "1/4": "w-1/4",
        "3/4": "w-3/4",
      },
      selected: {
        true: "",
        false: "",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed pointer-events-none",
        false: "cursor-pointer",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        "3xl": "rounded-3xl",
        full: "rounded-full",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        selected: true,
        className: "opacity-90",
      },
      {
        variant: "outline",
        selected: true,
        className: "bg-brand-50 dark:bg-brand-950",
      },
      {
        variant: "ghost",
        selected: true,
        className:
          "bg-brand-200 dark:bg-brand-925 text-brand-975 dark:text-brand-50",
      },
      {
        variant: "primary",
        selected: true,
        className: "bg-brand-200 dark:bg-brand-900",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      width: "fit",
      disabled: false,
      rounded: "full",
      selected: false,
    },
  },
);

type BaseButtonProps = {
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16 | 20 | 24 | 32;
  alignItems?: "center" | "start" | "end" | "baseline" | "stretch";
  justifyContent?: "center" | "start" | "end" | "between" | "around" | "evenly";
} & VariantProps<typeof buttonVariants>;

type ButtonAsButton = BaseButtonProps &
  Omit<
    BoxProps<"button">,
    | "disabled"
    | "className"
    | "alignItems"
    | "justifyContent"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "onDragEnter"
    | "onDragLeave"
    | "onDragOver"
    | "onDrop"
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
    | "onTransitionEnd"
  > & {
    href?: never;
  };

type ButtonAsLink = BaseButtonProps &
  Omit<
    ComponentPropsWithoutRef<typeof Link>,
    | "className"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "onDragEnter"
    | "onDragLeave"
    | "onDragOver"
    | "onDrop"
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
    | "onTransitionEnd"
  > & {
    href: string;
    disabled?: never;
    type?: never;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

// Cores adaptativas do spinner baseadas na variante
const getSpinnerColors = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case "default":
      return { border: "rgba(255, 255, 255, 0.3)", borderTop: "#ffffff" };
    case "outline":
    case "ghost":
    case "primary":
      return {
        border: "rgba(116, 116, 116, 0.3)",
        borderTop: "rgb(116, 116, 116)",
      };
    default:
      return { border: "rgba(255, 255, 255, 0.3)", borderTop: "#ffffff" };
  }
};

// Mapa de gap para classes Tailwind
const gapMap = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  7: "gap-7",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
  20: "gap-20",
  24: "gap-24",
  32: "gap-32",
};

const Button: React.FC<ButtonProps> = ({
  className,
  children,
  disabled,
  isLoading,
  variant,
  type = "button",
  width,
  size,
  selected,
  rounded,
  leftIcon,
  rightIcon,
  gap,
  alignItems = "center",
  justifyContent = "center",
  ...rest
}) => {
  const spinnerColors = getSpinnerColors(variant);
  const href = "href" in rest ? rest.href : undefined;

  const buttonClasses = cn(
    buttonVariants({
      disabled: disabled || isLoading,
      variant,
      width,
      selected,
      size,
      rounded,
    }),
    gap !== undefined && gapMap[gap],
    className,
  );

  const content = (
    <>
      {isLoading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          style={{
            width:
              size === "xs" || size === "icon-sm"
                ? 14
                : size === "sm"
                  ? 16
                  : size === "lg" || size === "icon-lg"
                    ? 20
                    : size === "xl"
                      ? 24
                      : 18,
            height:
              size === "xs" || size === "icon-sm"
                ? 14
                : size === "sm"
                  ? 16
                  : size === "lg" || size === "icon-lg"
                    ? 20
                    : size === "xl"
                      ? 24
                      : 18,
            border: `2px solid ${spinnerColors.border}`,
            borderTop: `2px solid ${spinnerColors.borderTop}`,
            borderRadius: "100%",
          }}
        />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </>
  );

  if (href) {
    const { href: linkHref, ...linkRest } = rest as ButtonAsLink;
    const MotionLink = motion.create(Link);

    return (
      <MotionLink
        href={linkHref}
        className={cn(buttonClasses, "flex")}
        style={{
          alignItems: alignItems || "center",
          justifyContent: justifyContent || "center",
        }}
        {...linkRest}
      >
        {content}
      </MotionLink>
    );
  }

  const MotionButton = motion.button;

  return (
    <MotionButton
      type={type}
      className={cn(buttonClasses, "flex")}
      style={{
        alignItems: alignItems || "center",
        justifyContent: justifyContent || "center",
      }}
      disabled={disabled || isLoading}
      {...(rest as Omit<ButtonAsButton, keyof BaseButtonProps>)}
    >
      {content}
    </MotionButton>
  );
};

export default Button;
