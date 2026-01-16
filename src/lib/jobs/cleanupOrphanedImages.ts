// Recriar S3Client aqui para evitar import circular

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Limpa imagens órfãs (não usadas) do R2 e do banco de dados
 * @param olderThanHours - Remove imagens uploaded há mais de X horas (default: 1h)
 * @returns Estatísticas da limpeza
 */
export async function cleanupOrphanedImages(olderThanHours = 1) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

  logger.info(
    { cutoffDate, olderThanHours },
    "Iniciando limpeza de imagens órfãs",
  );

  try {
    // Buscar uploads não usados e antigos
    const orphanedUploads = await prismaClient.uploadTracking.findMany({
      where: {
        used: false,
        uploadedAt: {
          lt: cutoffDate,
        },
      },
    });

    if (orphanedUploads.length === 0) {
      logger.info("Nenhuma imagem órfã encontrada");
      return {
        success: true,
        imagesDeleted: 0,
        recordsDeleted: 0,
      };
    }

    logger.info(
      { count: orphanedUploads.length },
      "Imagens órfãs encontradas, iniciando deleção",
    );

    let deletedFromR2 = 0;
    const failedDeletes: string[] = [];

    // Deletar do R2
    for (const upload of orphanedUploads) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: upload.key,
        });

        await R2.send(command);
        deletedFromR2++;

        logger.debug({ key: upload.key }, "Imagem deletada do R2");
      } catch (error) {
        logger.error(
          { key: upload.key, error },
          "Erro ao deletar imagem do R2",
        );
        failedDeletes.push(upload.key);
      }
    }

    // Deletar registros do banco (mesmo se falhou no R2)
    const { count: recordsDeleted } =
      await prismaClient.uploadTracking.deleteMany({
        where: {
          id: {
            in: orphanedUploads.map((u: { id: number }) => u.id),
          },
        },
      });

    const result = {
      success: true,
      imagesDeleted: deletedFromR2,
      recordsDeleted,
      failedDeletes,
    };

    logger.info(result, "Limpeza de imagens órfãs concluída");

    return result;
  } catch (error) {
    logger.error({ error }, "Erro durante limpeza de imagens órfãs");
    throw error;
  }
}
