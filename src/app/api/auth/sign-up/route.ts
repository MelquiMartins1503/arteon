import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "@/lib/exceptions/HttpExceptions";
import prismaClient from "@/lib/prismaClient";
import { type SignUpSchema, signUpSchema } from "@/lib/schemas/signUpSchema";

/**
 * POST /api/user
 *
 * Cria um novo usuário no sistema.
 * Por enquanto, apenas cria um usuário sem campos adicionais.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const parsed: SignUpSchema = signUpSchema.parse(data);
    const { name, email, password } = parsed;

    const userExists = await prismaClient.user.findUnique({
      where: {
        email,
      },
    });

    if (userExists) {
      throw new HttpExceptionClient(400, "1 Não foi possível criar o usuário.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (!passwordHash) {
      throw new HttpExceptionClient(500, "2 Não foi possível criar o usuário.");
    }

    const newUser = await prismaClient.user.create({
      data: {
        name,
        email,
        password: passwordHash,
      },
    });

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new HttpExceptionServer(500, "Secret JWT não encontrado.");
    }

    const token = jwt.sign({ id: newUser.id }, jwtSecret, {
      expiresIn: "1d",
    });

    if (!token) {
      throw new HttpExceptionServer(500, "Não foi possível criar o usuário.");
    }

    const response = NextResponse.json(
      { message: "Usuário criado com sucesso." },
      { status: 201 },
    );

    response.cookies.set("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 72,
    });

    return response;
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
