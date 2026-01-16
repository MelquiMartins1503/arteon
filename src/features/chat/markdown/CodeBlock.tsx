import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { Box } from "@/components/Box";

export const CodeBlock = ({
  children,
  node,
  ...props
}: ComponentPropsWithoutRef<"pre"> & { node?: unknown }) => {
  const codeElement = children as ReactElement<
    ComponentPropsWithoutRef<"code">
  >;
  const className = codeElement?.props?.className || "";
  const match = /language-(\w+)/.exec(className);

  return (
    <Box
      className="overflow-hidden my-4 rounded-xl border border-brand-200/10 bg-brand-900/95 dark:bg-brand-1100"
      flexDirection="col"
      gap={0}
    >
      <Box
        className="px-4 py-2 border-b border-brand-200/10 bg-brand-100 dark:bg-brand-1100/5"
        justifyContent="between"
        alignItems="center"
      >
        <span className="font-mono text-xs text-brand-200/60 dark:text-brand-600">
          {match?.[1] || "code"}
        </span>
      </Box>
      <pre
        {...props}
        className="overflow-x-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {children}
      </pre>
    </Box>
  );
};
