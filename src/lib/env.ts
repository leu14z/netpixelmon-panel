import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  DIRECT_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET deve ter no mínimo 32 caracteres"),
  AES_ENCRYPTION_KEY: z.string().min(32, "AES_ENCRYPTION_KEY deve ter no mínimo 32 caracteres"),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().default("1x0000000000000000000000000000000AA"),
  TURNSTILE_SECRET_KEY: z.string().default("1x000000000000000000000000000000000000000AA"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Validação fail-fast na inicialização do servidor
export const env = envSchema.parse(process.env);
