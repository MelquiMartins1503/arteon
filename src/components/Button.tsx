"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Box, type BoxProps } from "./Box";

export const buttonVariants = cva(
  "p-4 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-brand-850 dark:bg-white hover:bg-brand-700 dark:hover:bg-brand-400 max-[768px]:focus:bg-brand-700 max-[768px]:dark:focus:bg-brand-200 dark:text-brand-900 text-white",
        outline:
          "surface-brand-100 max-[768px]:focus:bg-brand-150 dark:bg-brand-950 dark:hover:bg-brand-850 max-[768px]:dark:focus:bg-brand-850",
        ghost:
          "bg-transparent hover:bg-brand-400 max-[768px]:focus:bg-brand-400 dark:hover:bg-brand-800 max-[768px]:dark:focus:bg-brand-800",
        secondary:
          "bg-brand-300 dark:bg-brand-800 hover:bg-brand-200 max-[768px]:focus:bg-brand-200 dark:hover:bg-brand-700 max-[768px]:dark:focus:bg-brand-700",
        none: "",
      },
      size: {
        xs: "min-h-8 max-h-8 text-xs",
        sm: "min-h-10 max-h-10 text-sm",
        md: "min-h-12 max-h-12 text-base",
        lg: "min-h-14 max-h-14 text-lg",
        xl: "min-h-16 max-h-16 text-xl",
        "1.5xl": "min-h-18 max-h-18 text-xl",
        icon: "min-h-10 max-h-10 min-w-10 max-w-10 p-0",
        "icon-sm": "min-h-8 max-h-8 min-w-8 max-w-8 p-0",
        "icon-lg": "min-h-12 max-h-12 min-w-12 max-w-12 p-0",
        fit: "max-h-fit",
      },
      width: {
        auto: "max-w-auto",
        fit: "max-w-fit",
        full: "max-w-full",
        xs: "min-w-8 max-w-8",
        sm: "min-w-10 max-w-10",
        md: "min-w-12 max-w-12",
        lg: "min-w-14 max-w-14",
        xl: "min-w-16 max-w-16",
        "1.5xl": "min-w-18 max-w-18",
        "1/2": "w-1/2",
        "1/3": "w-1/3",
        "2/3": "w-2/3",
        "1/4": "w-1/4",
        "3/4": "w-3/4",
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
      selected: {
        true: "",
        false: "",
      },
      disabled: {
        true: "opacity-50 cursor-normal",
        false: "cursor-pointer",
      },
    },
    compoundVariants: [
      {
        selected: true,
        variant: "ghost",
        className: "bg-brand-150 dark:bg-brand-800 opacity-100!",
      },
      {
        selected: true,
        variant: "default",
        className:
          "bg-brand-800 dark:bg-brand-400 text-white dark:text-brand-900 opacity-100!",
      },
      {
        selected: true,
        variant: "secondary",
        className: "bg-brand-200 dark:bg-brand-800 opacity-100!",
      },
      {
        selected: true,
        variant: "none",
        className: "opacity-100!",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      width: "fit",
      rounded: "full",
      selected: false,
      disabled: false,
    },
  },
);

export type ButtonProps<T extends ElementType = "button"> = BoxProps<T> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    href?: string;
  };

const getSpinnerClass = (variant: ButtonProps["variant"] = "default") => {
  switch (variant) {
    case "default":
      return "border-white/30 border-t-white dark:border-brand-900/30 dark:border-t-brand-900";
    case "ghost":
    case "outline":
    case "secondary":
      return "border-brand-600/30 border-t-brand-600 dark:border-white/30 dark:border-t-white";
    default:
      return "border-brand-600/30 border-t-brand-600 dark:border-white/30 dark:border-t-white";
  }
};

export const Button = <T extends ElementType = "button">({
  className,
  children,
  isLoading,
  variant,
  size,
  width,
  rounded,
  selected,
  leftIcon,
  rightIcon,
  href,
  as,
  disabled,
  ...rest
}: ButtonProps<T>) => {
  const spinnerClass = getSpinnerClass(variant);

  let Component = (as || motion.button) as ElementType;
  if (href && !as) {
    Component = motion.create(Link) as ElementType;
  }

  const variantClassName = buttonVariants({
    variant,
    size,
    width,
    rounded,
    selected,
    disabled: disabled || isLoading,
  });

  return (
    <Box
      as={Component}
      href={href}
      disabled={disabled || isLoading}
      className={cn(variantClassName, className)}
      justifyContent="center"
      alignItems="center"
      gap={2}
      {...rest}
    >
      {isLoading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className={cn("rounded-full border-2", spinnerClass)}
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
          }}
        />
      ) : (
        <>
          {leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </Box>
  );
};
