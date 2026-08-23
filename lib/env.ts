import { z } from "zod";

const envSchema = z.object({
  EVO_BASIC_TOKEN: z.string().min(1),
  EVO_API_BASE_URL: z.string().url().default("https://evo-integracao-api.w12app.com.br"),
  KORA_BRANCH_ID: z.string().optional(),
  POSTGRES_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  APP_PASSWORD: z.string().optional(),
  CRON_SECRET: z.string().optional()
});

export function getEnv() {
  return envSchema.parse({
    EVO_BASIC_TOKEN: process.env.EVO_BASIC_TOKEN,
    EVO_API_BASE_URL: process.env.EVO_API_BASE_URL,
    KORA_BRANCH_ID: process.env.KORA_BRANCH_ID,
    POSTGRES_URL: process.env.POSTGRES_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_BASE_URL: process.env.APP_BASE_URL,
    APP_PASSWORD: process.env.APP_PASSWORD,
    CRON_SECRET: process.env.CRON_SECRET
  });
}
