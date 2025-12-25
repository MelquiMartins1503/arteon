import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import prismaClient from "@/lib/prismaClient";
import { apiErrorHandler } from "@/utils/apiErrorHandlers";
import { HttpExceptionServer } from "@/utils/exceptions/HttpExceptions";
import { forgotPasswordSchema } from "@/utils/schemas/passwordRecovery";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const userExists = await prismaClient.user.findUnique({
      where: {
        email,
      },
    });

    if (userExists) {
      const token = jwt.sign(
        {
          id: userExists.id,
          type: "reset-password",
          resetPasswordTokenVersion: userExists.resetPasswordTokenVersion,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "10m",
        },
      );

      if (!token) {
        throw new HttpExceptionServer(500, "Erro interno no servidor.");
      }

      return NextResponse.json(
        { link: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}` },
        { status: 200 },
      );
    }

    return NextResponse.json({ status: 200 });
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
