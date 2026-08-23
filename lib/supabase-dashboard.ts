import type { DashboardPayload } from "@/lib/types";

const endpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-dashboard-secure";

export async function getDashboardFromSupabase(): Promise<DashboardPayload> {
  const secret = process.env.KORA_DASHBOARD_READ_SECRET;
  if (!secret) {
    throw new Error("Conexão segura com o Supabase não configurada.");
  }

  const response = await fetch(endpoint, {
    headers: { "x-kora-dashboard-secret": secret },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar os dados salvos no Supabase.");
  }

  return (await response.json()) as DashboardPayload;
}
