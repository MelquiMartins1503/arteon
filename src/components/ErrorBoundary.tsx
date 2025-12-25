"use client";

import { Component, type ReactNode } from "react";
import { Box } from "./ui/Box";
import Button from "./ui/Button";
import Typography from "./ui/Typography";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // TODO: Send to error tracking service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Box
          flexDirection="col"
          alignItems="center"
          justifyContent="center"
          gap={4}
          className="min-h-screen p-8"
        >
          <Box
            flexDirection="col"
            alignItems="center"
            gap={3}
            className="max-w-md text-center"
          >
            <Typography as="h1" size="4xl" weight="bold">
              Algo deu errado
            </Typography>

            <Typography
              as="p"
              size="lg"
              className="text-brand-700 dark:text-brand-500"
            >
              Desculpe, ocorreu um erro inesperado. Tente recarregar a página ou
              entre em contato com o suporte se o problema persistir.
            </Typography>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <Box
                flexDirection="col"
                gap={2}
                className="w-full p-4 mt-4 rounded-lg bg-red-50 dark:bg-red-950/20"
              >
                <Typography
                  as="p"
                  weight="medium"
                  className="text-red-600 dark:text-red-400"
                >
                  {this.state.error.message}
                </Typography>
                {this.state.error.stack && (
                  <pre className="text-xs overflow-auto text-red-500 dark:text-red-400">
                    {this.state.error.stack}
                  </pre>
                )}
              </Box>
            )}

            <Box gap={3} className="mt-4">
              <Button variant="primary" onClick={this.handleReset}>
                Tentar novamente
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Voltar ao início
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
