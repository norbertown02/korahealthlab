import { DashboardShell } from "@/components/dashboard-shell";
import { getLatestDashboard } from "@/lib/repository";
import type { DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let payload: DashboardPayload | null = null;
  let setupMessage: string | null = null;

  try {
    payload = (await getLatestDashboard()) as DashboardPayload | null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setupMessage = `O dashboard consulta exclusivamente o historico salvo no Supabase. Detalhe tecnico: ${message}`;
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
