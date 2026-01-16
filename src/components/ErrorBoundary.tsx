"use client";

import { Component, type ReactNode } from "react";
import logger from "@/lib/logger";
import { Box } from "./Box";
import { Button } from "./Button";
import { Typography } from "./Typography";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    logger.error(
      {
        error,
        errorInfo,
        componentStack: errorInfo.componentStack,
      },
      "React Error Boundary caught an error",
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          flexDirection="col"
          alignItems="center"
          justifyContent="center"
          gap={4}
          className="min-h-screen p-4"
        >
          <Box flexDirection="col" alignItems="center" gap={2}>
            <Typography variant="h2" className="text-red-500">
              Algo deu errado
            </Typography>
            <Typography className="text-center max-w-md">
              Ocorreu um erro inesperado. Nossa equipe foi notificada e está
              trabalhando na solução.
            </Typography>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <Box
                flexDirection="col"
                gap={1}
                className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg max-w-2xl overflow-auto"
              >
                <Typography variant="small" className="font-mono text-red-600">
                  {this.state.error.message}
                </Typography>
                {this.state.error.stack && (
                  <Typography
                    variant="small"
                    className="font-mono text-red-500 text-xs whitespace-pre-wrap"
                  >
                    {this.state.error.stack}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          <Button onClick={this.handleReset} variant="default">
            Tentar novamente
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
