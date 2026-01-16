"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
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

export function NextThemeTrigger() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <Box
      as="button"
      type="button"
      onClick={toggleTheme}
      className="w-full h-full cursor-pointer"
    >
      Toggle Theme
    </Box>
  );
}
