import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Skeleton Component
 * Displays an animated placeholder while content is loading
 *
 * @example
 * <Skeleton className="h-12 w-full" />
 * <Skeleton className="h-4 w-1/2" />
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-brand-200 dark:bg-brand-800",
        className,
      )}
      {...props}
    />
  );
}
