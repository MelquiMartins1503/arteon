import { jwtVerify } from "jose";
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

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    const user = await prismaClient.user.findUnique({
      where: {
        id: payload.id as number,
      },
    });

    if (!user) {
      throw new HttpExceptionClient(401, "Não autorizado.");
    }

    return user;
  } catch (_error) {
    throw new HttpExceptionClient(401, "Token inválido.");
  }
}
