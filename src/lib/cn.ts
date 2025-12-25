import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  // une classes com clsx e resolve conflitos com twMerge
  return twMerge(clsx(...inputs));
}
