import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import prismaClient from "@/lib/prismaClient";
import { resetPasswordSchema } from "@/lib/schemas/passwordRecovery";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const body = await request.json();
    const { password, confirmPassword } = body;

    const token = (await params).token;

    if (!token) {
      throw new HttpExceptionClient(400, "Token não fornecido.");
    }

    const { password: validatedPassword } = resetPasswordSchema.parse({
      password,
      confirmPassword,
    });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      type: string;
      resetPasswordTokenVersion: number;
    };

    if (typeof decoded === "string" || !decoded.id) {
      throw new HttpExceptionClient(401, "Token inválido ou expirado.");
    }

    if (decoded.type !== "reset-password") {
      throw new HttpExceptionClient(401, "Token inválido ou expirado.");
    }

    const userExists = await prismaClient.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!userExists) {
      throw new HttpExceptionClient(404, "Usuário não encontrado.");
    }

    if (await bcrypt.compare(validatedPassword, userExists.password)) {
      throw new HttpExceptionClient(
        400,
        "A senha informada é a mesma que a atual.",
      );
    }

    if (
      decoded.resetPasswordTokenVersion !== userExists.resetPasswordTokenVersion
    ) {
      throw new HttpExceptionClient(401, "Token inválido ou já utilizado.");
    }

    const hashedPassword = await bcrypt.hash(validatedPassword, 10);

    await prismaClient.user.update({
      where: {
        id: userExists.id,
      },
      data: {
        password: hashedPassword,
        resetPasswordTokenVersion: { increment: 1 },
      },
    });

    return NextResponse.json(
      { message: "Senha alterada com sucesso." },
      { status: 200 },
    );
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
