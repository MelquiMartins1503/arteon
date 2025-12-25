import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Box } from "@/components/ui/Box";
import { cn } from "@/lib/cn";
import NextThemeProvider from "@/providers/NextThemeProvider";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arteon",
  description: "Arteon - Desenvolvimento de Software",
};

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
          "w-screen h-dvh overflow-hidden antialiased",
        )}
      >
        <NextThemeProvider>{children}</NextThemeProvider>
      </Box>
    </html>
  );
}
