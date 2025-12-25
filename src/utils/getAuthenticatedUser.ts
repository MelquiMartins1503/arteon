import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prismaClient from "@/lib/prismaClient";
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "./exceptions/HttpExceptions";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    throw new HttpExceptionClient(401, "Não autorizado.");
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new HttpExceptionServer(500, "Secret JWT não encontrado.");
  }

  const decodedToken = jwt.verify(token, jwtSecret);

  if (typeof decodedToken === "string") {
    throw new HttpExceptionServer(500, "Token inválido.");
  }

  const user = await prismaClient.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!user) {
    throw new HttpExceptionClient(401, "Não autorizado.");
  }

  return user;
}
