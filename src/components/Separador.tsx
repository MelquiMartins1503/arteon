import type { FC } from "react";
import { cn } from "@/lib/cn";
import { Box } from "./Box";

const Separator: FC<{ className?: string }> = ({ className }) => {
  return (
    <Box
      className={cn("w-full h-px bg-brand-400 dark:bg-brand-700", className)}
    />
  );
};

export default Separator;
