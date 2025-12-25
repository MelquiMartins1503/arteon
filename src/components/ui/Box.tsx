import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentPropsWithRef,
  type ElementType,
  forwardRef,
  type JSX,
} from "react";
import { cn } from "@/lib/cn";

export const boxVariants = cva("flex", {
  variants: {
    alignItems: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
    flexDirection: {
      row: "flex-row",
      col: "flex-col",
      "row-reverse": "flex-row-reverse",
      "col-reverse": "flex-col-reverse",
    },
    justifyContent: {
      normal: "justify-normal",
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
      evenly: "justify-evenly",
    },
    gap: {
      0: "gap-0",
      1: "gap-1", // extra pequeno (4px)
      2: "gap-2", // pequeno (8px)
      3: "gap-3", // médio (12px)
      4: "gap-4", // padrão (16px)
      6: "gap-6", // grande (24px)
      8: "gap-8", // extra grande (32px)
    },
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
  },
  defaultVariants: {
    alignItems: "stretch",
    flexDirection: "row",
    justifyContent: "start",
    gap: 4,
    wrap: false,
  },
});

export type ExcludeTags =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "blockquote"
  | "address"
  | "span"
  | "strong"
  | "em"
  | "b"
  | "i"
  | "u"
  | "mark"
  | "small"
  | "del"
  | "ins"
  | "sub"
  | "sup"
  | "abbr"
  | "cite"
  | "code"
  | "kbd"
  | "samp"
  | "time"
  | "var"
  | "q"
  | "dfn"
  | "figcaption";

type AllowedTags = Exclude<keyof JSX.IntrinsicElements, ExcludeTags>;

// Utility to extract props properly
export type BoxProps<T extends AllowedTags | ElementType = "div"> = {
  as?: T;
} & VariantProps<typeof boxVariants> &
  Omit<ComponentPropsWithRef<T>, "as">;

const BoxComponent = forwardRef(
  <T extends AllowedTags | ElementType = "div">(
    {
      as,
      children,
      className,
      alignItems,
      flexDirection,
      justifyContent,
      gap,
      wrap,
      ...rest
    }: Omit<BoxProps<T>, "ref">,
    ref: React.ForwardedRef<any>,
  ) => {
    const BoxComponent = (as || "div") as ElementType;

    return (
      <BoxComponent
        ref={ref}
        className={cn(
          boxVariants({ alignItems, flexDirection, justifyContent, gap, wrap }),
          className,
        )}
        {...rest}
      >
        {children}
      </BoxComponent>
    );
  },
);

BoxComponent.displayName = "Box";

export const Box = BoxComponent as <
  T extends AllowedTags | ElementType = "div",
>(
  props: BoxProps<T>,
) => JSX.Element;
