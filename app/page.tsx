import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardFromSupabase } from "@/lib/supabase-dashboard";
import type { DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let payload: DashboardPayload | null = null;
  let setupMessage: string | null = null;

  try {
    payload = await getDashboardFromSupabase();
  } catch {
    setupMessage = "Não foi possível consultar os dados salvos no Supabase. Tente atualizar a página em instantes.";
  }

  if (!payload) {
    return (
      <main className="page-shell">
        <section className="hero">
          <div className="eyebrow">Kora Health Lab • BI online</div>
          <h1>Dados em preparação.</h1>
          <p className="hero-copy">
            O painel consulta exclusivamente o histórico salvo no Supabase.
          </p>
          {setupMessage ? <p className="hero-copy">{setupMessage}</p> : null}
        </section>
      </main>
    );
  }

  return <DashboardShell data={payload} />;
}
