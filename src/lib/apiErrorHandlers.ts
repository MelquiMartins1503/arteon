import { NextResponse } from "next/server";
import z from "zod";
import logger from "@/lib/logger";
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "./exceptions/HttpExceptions";

export async function apiErrorHandler(error: unknown) {
  if (error instanceof HttpExceptionServer) {
    logger.error({ error, statusCode: error.statusCode }, "Server exception");
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof HttpExceptionClient) {
    logger.warn({ error, statusCode: error.statusCode }, "Client exception");
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof z.ZodError) {
    logger.warn({ error: z.treeifyError(error) }, "Validation error");
    return NextResponse.json(
      { message: z.treeifyError(error) },
      { status: 400 },
    );
  }

  // Log unexpected errors with full context
  logger.error(
    {
      error,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    "Unexpected error in API route",
  );

  return NextResponse.json(
    { message: "Erro interno do servidor" },
    { status: 500 },
  );
}
