import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import logger from "./logger";

// IMPORTANT: This module should only be imported in server-side code (API routes)
// Client-side code should use /api/presigned-url endpoint instead

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    await R2.send(command);
    return key; // Return the key, not the public URL
  } catch (error) {
    logger.error({ error, key, contentType }, "Failed to upload file to R2");
    throw new Error("Failed to upload file to storage.");
  }
}

export async function getPresignedUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  // URL valid for 1 hour
  return await getSignedUrl(R2, command, { expiresIn: 3600 });
}
