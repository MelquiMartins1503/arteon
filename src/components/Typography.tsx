import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
  type JSX,
  memo,
} from "react";
import { cn } from "@/lib/cn";

export const typographyVariants = cva("tracking-tight break-words", {
  variants: {
    variant: {
      h1: "scroll-m-20 font-extrabold text-balance",
      h2: "scroll-m-20 font-semibold first:mt-0",
      h3: "scroll-m-20 font-semibold",
      h4: "scroll-m-20 font-semibold",
      p: "leading-7 [&:not(:first-child)]:mt-1",
      blockquote: "mt-6 border-l-2 pl-6 italic text-muted-foreground",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono font-semibold tabular-nums",
      lead: "text-muted-foreground",
      small: "font-medium leading-none",
      span: "",
    },
    size: {
      default: "",
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
      "5xl": "text-5xl",
    },
    weight: {
      default: "",
      thin: "font-thin",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
    },
    italic: {
      true: "italic",
      false: "",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
    },
    leading: {
      none: "leading-none",
      tight: "leading-tight",
      snug: "leading-snug",
      normal: "leading-normal",
      relaxed: "leading-relaxed",
      loose: "leading-loose",
    },
    truncate: {
      true: "truncate",
      false: "",
    },
    transform: {
      none: "",
      uppercase: "uppercase tracking-wider",
      lowercase: "lowercase",
      capitalize: "capitalize",
    },
    whitespace: {
      normal: "whitespace-normal",
      nowrap: "whitespace-nowrap",
      pre: "whitespace-pre",
      prewrap: "whitespace-pre-wrap",
    },
    selectable: {
      true: "select-text",
      false: "select-none",
    },
  },
  defaultVariants: {
    variant: "p",
    size: "default",
    weight: "default",
    italic: false,
    align: "left",
    leading: "normal",
    truncate: false,
    transform: "none",
    whitespace: "normal",
    selectable: true,
  },
  compoundVariants: [
    {
      variant: "h1",
      size: "default",
      class: "text-4xl sm:text-5xl lg:text-6xl",
    },
    { variant: "h2", size: "default", class: "text-3xl sm:text-4xl" },
    { variant: "h3", size: "default", class: "text-2xl sm:text-3xl" },
    { variant: "h4", size: "default", class: "text-xl" },
    { variant: "p", size: "default", class: "text-base" },
    { variant: "blockquote", size: "default", class: "text-base" },
    { variant: "code", size: "default", class: "text-sm" },
    { variant: "lead", size: "default", class: "text-xl" },
    { variant: "small", size: "default", class: "text-sm" },
    { variant: "span", size: "default", class: "text-base" },
  ],
});

const validVariants = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "blockquote",
  "code",
  "lead",
  "small",
  "span",
] as const;

type ExcludeTags =
  | "div"
  | "main"
  | "header"
  | "footer"
  | "section"
  | "article"
  | "aside"
  | "nav"
  | "figure"
  | "details"
  | "summary"
  | "hr"
  | "img"
  | "video"
  | "audio"
  | "iframe"
  | "embed"
  | "object"
  | "source"
  | "track"
  | "map"
  | "area"
  | "picture"
  | "svg"
  | "canvas"
  | "form"
  | "input"
  | "button"
  | "select"
  | "option"
  | "textarea"
  | "label"
  | "fieldset"
  | "legend"
  | "datalist"
  | "output"
  | "progress"
  | "meter"
  | "ul"
  | "ol"
  | "li"
  | "dl"
  | "dt"
  | "dd"
  | "table"
  | "thead"
  | "tbody"
  | "tfoot"
  | "tr"
  | "td"
  | "th"
  | "col"
  | "colgroup"
  | "caption"
  | "a"
  | "dialog"
  | "slot";

type AllowedTags = Exclude<keyof JSX.IntrinsicElements, ExcludeTags>;

export type TypographyProps<T extends AllowedTags | ElementType = "span"> = {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as"> &
  VariantProps<typeof typographyVariants>;

const TypographyComponent = forwardRef(
  <T extends AllowedTags | ElementType = "span">(
    {
      as,
      variant,
      size,
      weight,
      italic,
      align,
      leading,
      truncate,
      transform,
      whitespace,
      selectable,
      className,
      children,
      ...rest
    }: TypographyProps<T>,
    // biome-ignore lint/suspicious/noExplicitAny: Ref needs to be generic for polymorphism
    ref: React.ForwardedRef<any>,
  ) => {
    const Component = as || "span";

    let finalVariant = variant;

    if (!finalVariant && typeof as === "string") {
      const isVariant = (val: string): val is (typeof validVariants)[number] =>
        validVariants.includes(val as (typeof validVariants)[number]);

      if (isVariant(as)) {
        finalVariant = as;
      }
    }

    return (
      <Component
        {...rest}
        ref={ref}
        className={cn(
          typographyVariants({
            variant: finalVariant,
            weight,
            size,
            italic,
            align,
            leading,
            truncate,
            transform,
            whitespace,
            selectable,
          }),
          className,
        )}
      >
        {children}
      </Component>
    );
  },
) as <T extends AllowedTags | ElementType = "span">(
  props: TypographyProps<T> & { ref?: React.Ref<Element> },
) => React.JSX.Element;

// Memoize to prevent unnecessary re-renders
export const Typography = memo(
  TypographyComponent,
) as typeof TypographyComponent;
