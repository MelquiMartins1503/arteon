"use client";

import type { ComponentProps, FC, HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { Box } from "./Box";
import { Typography } from "./Typography";

type BoxProps = ComponentProps<typeof Box>;

type TypographyProps = ComponentProps<typeof Typography>;

const Root: FC<BoxProps> = ({
  as = "form",
  flexDirection = "col",
  gap = 6,
  className,
  children,
  ...props
}) => (
  <Box
    as={as}
    flexDirection={flexDirection}
    gap={gap}
    className={cn("w-[640px] max-[768px]:w-full", className)}
    {...props}
  >
    {children}
  </Box>
);

const HeaderRoot: FC<BoxProps> = ({
  flexDirection = "col",
  gap = 1,
  className,
  children,
  ...props
}) => (
  <Box flexDirection={flexDirection} gap={gap} className={className} {...props}>
    {children}
  </Box>
);

const HeaderTitle: FC<TypographyProps> = ({ children, ...props }) => (
  <Typography as="h2" weight="semibold" size="5xl" {...props}>
    {children}
  </Typography>
);

const HeaderDescription: FC<TypographyProps> = ({
  children,
  className,
  as = "p",
  size = "xl",
  ...props
}) => (
  <Typography
    as={as}
    size={size}
    className={cn("text-brand-600 dark:text-brand-500", className)}
    {...props}
  >
    {children}
  </Typography>
);

const HeaderStepIndicator: FC<
  {
    current: number;
    maxStep: number;
  } & Pick<HTMLAttributes<HTMLDivElement>, "className">
> = ({ current, maxStep, className }) => {
  const steps = Array.from({ length: maxStep }, (_, index) => index + 1);

  const count = current++;

  return (
    <Box
      flexDirection="col"
      alignItems="start"
      gap={2}
      className={cn("w-full", className)}
    >
      {/*
        <span className="text-sm text-brand-700 dark:text-brand-100">
          Step {count + 1} of {maxStep}
        </span>
      */}

      <Box as="ul" alignItems="center" gap={2} className="flex-wrap w-full">
        {steps.map((step) => (
          <li key={step} className="flex flex-1">
            <div
              className={cn(
                "flex-1 h-1 rounded bg-brand-700 dark:bg-brand-100 transition-opacity",
                step === count + 1 ? "opacity-100" : "opacity-50",
              )}
            ></div>
          </li>
        ))}
      </Box>
    </Box>
  );
};

interface FieldsetProps extends BoxProps {
  legend?: string;
}

const Fieldset: FC<FieldsetProps> = ({
  as = "fieldset",
  legend,
  flexDirection = "col",
  gap = 4,
  className,
  children,
  ...props
}) => (
  <Box
    as={as}
    flexDirection={flexDirection}
    gap={gap}
    className={cn("w-full", className)}
    {...props}
  >
    {legend && (
      <Box as="legend" className="sr-only">
        {legend}
      </Box>
    )}

    {children}
  </Box>
);

const Group: FC<BoxProps> = ({
  alignItems = "center",
  justifyContent = "between",
  className,
  children,
  ...props
}) => (
  <Box
    alignItems={alignItems}
    justifyContent={justifyContent}
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </Box>
);

const Row: FC<BoxProps> = ({
  flexDirection = "row",
  gap = 4,
  className,
  children,
  ...props
}) => (
  <Box
    flexDirection={flexDirection}
    gap={gap}
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </Box>
);

const Actions: FC<BoxProps> = ({
  flexDirection = "col",
  gap = 4,
  className,
  children,
  ...props
}) => (
  <Box
    flexDirection={flexDirection}
    gap={gap}
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </Box>
);

const Footer: FC<BoxProps> = ({
  alignItems = "center",
  justifyContent = "center",
  flexDirection = "row",
  gap = 2,
  className,
  children,
  ...props
}) => (
  <Box
    alignItems={alignItems}
    justifyContent={justifyContent}
    flexDirection={flexDirection}
    gap={gap}
    className={className}
    {...props}
  >
    {children}
  </Box>
);

const Header = Object.assign(HeaderRoot, {
  Title: HeaderTitle,
  Description: HeaderDescription,
  StepIndicator: HeaderStepIndicator,
});

const Form = Object.assign(Root, {
  Header,
  Fieldset,
  Group,
  Row,
  Actions,
  Footer,
});

export default Form;
