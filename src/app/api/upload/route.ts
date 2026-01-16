import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import { HttpExceptionClient } from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { uploadFile } from "@/lib/storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILES = 5;

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser();

    const formData = await request.formData();
    const files = formData.getAll("images");

    if (files.length === 0) {
      throw new HttpExceptionClient(400, "Nenhuma imagem foi enviada");
    }

    if (files.length > MAX_FILES) {
      throw new HttpExceptionClient(
        400,
        `Máximo de ${MAX_FILES} imagens por vez`,
      );
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        throw new HttpExceptionClient(400, "Arquivo inválido");
      }

      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new HttpExceptionClient(
          400,
          `Tipo de arquivo não permitido: ${file.type}. Permitidos: JPEG, PNG, GIF, WebP`,
        );
      }

      // Validar tamanho
      if (file.size > MAX_FILE_SIZE) {
        throw new HttpExceptionClient(
          400,
          `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: 5MB`,
        );
      }

      // Gerar nome único para o arquivo
      const extension = file.name.split(".").pop() || "jpg";
      const key = `chat-images/${nanoid()}.${extension}`;

      // Converter File para Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload para R2
      const uploadedKey = await uploadFile(key, buffer, file.type);

      // Rastrear upload temporário para limpeza de órfãos
      await prismaClient.uploadTracking.create({
        data: {
          key: uploadedKey,
          userId: user.id,
        },
      });

      // Retornar a key que será usada para gerar presigned URL quando necessário
      uploadedUrls.push(uploadedKey);

      logger.info(
        {
          fileName: file.name,
          fileSize: file.size,
          key: uploadedKey,
        },
        "Image uploaded successfully",
      );
    }

    return NextResponse.json(
      {
        urls: uploadedUrls,
        count: uploadedUrls.length,
      },
      { status: 200 },
    );
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
