import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),

  // AI
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY é obrigatória"),

  // Cloudflare R2 Storage
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID é obrigatório"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID é obrigatório"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY é obrigatório"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME é obrigatório"),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Optional
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional()
    .default("info"),
});

// Validate and export
// IMPORTANTE: Apenas valida no servidor, pois variáveis não estão disponíveis no cliente
const isServer = typeof window === "undefined";
export const env = isServer
  ? envSchema.parse(process.env)
  : ({} as z.infer<typeof envSchema>); // Cliente retorna objeto vazio

// Type for autocomplete
export type Env = z.infer<typeof envSchema>;
