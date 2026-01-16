import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import prismaClient from "@/lib/prismaClient";
import { signInSchema } from "@/lib/schemas/signInSchema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = signInSchema.parse(body);

    // Buscar usuário
    const user = await prismaClient.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpExceptionClient(401, "Email ou senha incorretos");
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new HttpExceptionClient(401, "Email ou senha incorretos");
    }

    // Gerar token JWT
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new HttpExceptionClient(500, "Erro ao fazer login");
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: "1d" },
    );

    // Criar resposta com cookie
    const response = NextResponse.json(
      {
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 },
    );

    // Configurar cookie
    response.cookies.set("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 72,
      path: "/",
    });

    return response;
  } catch (error) {
    return await apiErrorHandler(error);
  }
}
