import type { ComponentPropsWithoutRef } from "react";
import type { Components } from "react-markdown";
import Separator from "@/components/Separador";
import { cn } from "@/lib/cn";
import { CodeBlock } from "./CodeBlock";

export const aiMarkdownComponents: Components = {
  /* ---------- Texto e Listas ---------- */
  p: ({ node, className, ...props }) => (
    <p
      {...props}
      className={cn(
        "mb-2 leading-7 last:mb-0 text-brand-900 dark:text-brand-100",
      )}
    />
  ),

  strong: ({ node, className, ...props }) => (
    <strong {...props} className={cn("font-semibold font-inherit")} />
  ),

  ul: ({ node, className, ...props }) => (
    <ul {...props} className={cn("mb-4 ml-6 space-y-2 list-disc")} />
  ),

  ol: ({ node, className, ...props }) => (
    <ol {...props} className={cn("mb-4 ml-6 space-y-2 list-decimal")} />
  ),

  li: ({ node, className, ...props }) => (
    <li {...props} className={cn("pl-1 leading-7")} />
  ),

  /* ---------- Títulos ---------- */
  // Reduzi um pouco as proporções para ficarem mais harmônicas em chats
  h1: ({ node, className, ...props }) => (
    <h1
      {...props}
      className={cn("mt-8 mb-4 text-2xl tracking-tight scroll-m-20 first:mt-0")}
    />
  ),

  h2: ({ node, className, ...props }) => (
    <h2
      {...props}
      className={cn(
        "pb-2 mt-8 mb-0 text-xl font-semibold tracking-tight scroll-m-20 first:mt-0",
      )}
    />
  ),

  h3: ({ node, className, ...props }) => (
    <h3
      {...props}
      className={cn(
        "mt-6 mb-2 text-base font-semibold tracking-tight scroll-m-20 first:mt-0",
      )}
    />
  ),

  /* ---------- Tabelas (Essencial) ---------- */
  table: ({ node, ...props }) => (
    <div className="overflow-y-auto my-6 w-full rounded-lg border border-brand-200 dark:border-brand-800">
      <table
        {...props}
        className={cn("w-full border-collapse text-sm", props.className)}
      />
    </div>
  ),

  thead: ({ node, className, ...props }) => (
    <thead {...props} className={cn("bg-brand-50 dark:bg-brand-900/50")} />
  ),

  th: ({ node, className, ...props }) => (
    <th
      {...props}
      className={cn(
        "border-b border-brand-200 dark:border-brand-800 px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
      )}
    />
  ),

  td: ({ node, className, ...props }) => (
    <td
      {...props}
      className={cn(
        "border-b border-brand-100 dark:border-brand-800/50 px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right",
      )}
    />
  ),

  /* ---------- Outros Elementos ---------- */
  blockquote: ({ node, className, ...props }) => (
    <blockquote
      {...props}
      className={cn(
        "pl-6 my-4 mt-6 italic border-l-4 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-700 whitespace-pre-wrap",
      )}
    />
  ),

  a: ({ node, className, ...props }) => (
    <a
      {...props}
      className={cn(
        "font-medium underline transition-colors underline-offset-4 text-primary hover:text-primary/80",
      )}
      target="_blank"
      rel="noreferrer"
    />
  ),

  hr: ({ node, className, ...props }) => (
    <Separator {...props} className="my-8" />
  ),

  code: ({
    node,
    className,
    children,
    ...props
  }: ComponentPropsWithoutRef<"code"> & { node?: unknown }) => {
    const isBlock = className?.startsWith("language-");

    if (isBlock) {
      return (
        <code {...props} className={className}>
          {children}
        </code>
      );
    }

    return (
      <code
        {...props}
        className={cn(
          "relative rounded bg-brand-100 dark:bg-brand-800/50 px-[0.4rem] py-[0.2rem] font-mono text-sm font-semibold text-brand-900 dark:text-brand-200",
          className,
        )}
      >
        {children}
      </code>
    );
  },

  pre: (props) => <CodeBlock {...props} />,
};
