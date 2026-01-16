/**
 * Custom error classes for consistent error handling
 */

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500,
    public isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409);
  }
}

/**
 * Handle errors consistently
 */
export function handleError(error: unknown, context?: string) {
  if (error instanceof AppError) {
    return {
      success: false as const,
      error: error.message,
      statusCode: error.statusCode,
    };
  }

  // Log unexpected errors
  console.error(`Unexpected error${context ? ` in ${context}` : ""}:`, error);

  return {
    success: false as const,
    error: "An unexpected error occurred",
    statusCode: 500,
  };
}
