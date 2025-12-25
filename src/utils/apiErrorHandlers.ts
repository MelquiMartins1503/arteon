import { NextResponse } from "next/server";
import z from "zod";
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "./exceptions/HttpExceptions";

export async function apiErrorHandler(error: unknown) {
  if (error instanceof HttpExceptionServer) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof HttpExceptionClient) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { message: z.treeifyError(error) },
      { status: 400 },
    );
  }

  console.error("Erro interno do servidor", error);
  return NextResponse.json(
    { message: "Erro interno do servidor" },
    { status: 500 },
  );
}
