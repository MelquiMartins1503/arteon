import type React from "react";
import "./globals.css";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { Box } from "@/components/Box";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/cn";
import NextThemeProvider from "@/providers/NextThemeProvider";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <Box
        as="body"
        className={cn(
          poppins.variable,
          "w-full h-dvh overflow-hidden antialiased text-brand-900 dark:text-white",
        )}
      >
        <ErrorBoundary>
          <NextThemeProvider>
            <Toaster position="top-right" richColors />
            {children}
          </NextThemeProvider>
        </ErrorBoundary>
      </Box>
    </html>
  );
}
