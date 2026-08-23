import { z } from "zod";

const databaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional()
});

const evoEnvSchema = z.object({
  EVO_BASIC_TOKEN: z.string().min(1),
  EVO_DNS: z.string().min(1).default("evo"),
  EVO_API_BASE_URL: z.string().url().default("https://evo-integracao-api.w12app.com.br"),
  KORA_BRANCH_ID: z.string().optional()
});

export function getDatabaseEnv() {
  const env = databaseEnvSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configure SUPABASE_SECRET_KEY na Vercel.");
  }

  return env;
}

export function getEvoEnv() {
  return evoEnvSchema.parse({
    EVO_BASIC_TOKEN: process.env.EVO_BASIC_TOKEN,
    EVO_DNS: process.env.EVO_DNS,
    EVO_API_BASE_URL: process.env.EVO_API_BASE_URL,
    KORA_BRANCH_ID: process.env.KORA_BRANCH_ID
  });
}
