"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";

export default function NextThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Box
        as="main"
        alignItems="center"
        justifyContent="center"
        className="relative w-full h-full p-4 bg-brand-50 dark:bg-brand-1000"
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
      className="z-50 text-black dark:text-white"
    >
      Toggle Theme
    </Box>
  );
}
