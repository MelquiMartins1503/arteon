"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { cloneElement, type FC, useEffect, useState } from "react";
import { Box } from "@/components/Box";

export default function NextThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Box
        as="main"
        gap={0}
        alignItems="center"
        justifyContent="center"
        className="w-full h-full bg-brand-50 dark:bg-brand-950"
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}

export const NextThemeTrigger: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  // Clone the child element and merge the onClick handler
  if (!children || typeof children !== "object") return null;

  const child = children as React.ReactElement;
  // biome-ignore lint/suspicious/noExplicitAny: Need flexible type for dynamic props
  const childProps = (child.props || {}) as any;

  // biome-ignore lint/suspicious/noExplicitAny: Need flexible type for cloneElement
  return cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      toggleTheme();
      if (childProps.onClick) childProps.onClick(e);
    },
  } as any);
};
