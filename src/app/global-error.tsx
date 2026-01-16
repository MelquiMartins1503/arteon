"use client";

import { Poppins } from "next/font/google";
import { useEffect } from "react";
import { Box } from "@/components/Box";
import { cn } from "@/lib/cn";
import "./globals.css";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <Box
        as="body"
        className={cn(
          poppins.variable,
          "w-full h-dvh overflow-hidden antialiased text-brand-900 bg-white flex flex-col items-center justify-center gap-4",
        )}
      >
        <h2 className="text-2xl font-bold">Algo deu errado!</h2>
        <p className="text-gray-600">Ocorreu um erro crítico na aplicação.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
        >
          Tentar novamente
        </button>
      </Box>
    </html>
  );
}
