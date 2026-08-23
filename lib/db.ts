import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getDatabaseEnv } from "@/lib/env";

declare global {
  var koraSupabase: SupabaseClient | undefined;
}

export function getSupabaseAdmin() {
  if (!global.koraSupabase) {
    const env = getDatabaseEnv();
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

    global.koraSupabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return global.koraSupabase;
}
