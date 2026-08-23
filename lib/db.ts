import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

declare global {
  var koraSupabase: SupabaseClient | undefined;
}

export function getSupabaseAdmin() {
  if (!global.koraSupabase) {
    const env = getEnv();
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Configure SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel.");
    }

    global.koraSupabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return global.koraSupabase;
}
