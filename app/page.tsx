import { DashboardShell } from "@/components/dashboard-shell";
import { getLatestDashboard } from "@/lib/repository";
import type { DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const payload = (await getLatestDashboard()) as DashboardPayload | null;

  if (!payload) {
    return (
      <main className="page-shell">
        <section className="hero">
          <div className="eyebrow">Kora Health Lab • BI online</div>
          <h1>Aplicação pronta. Falta só a primeira sincronização.</h1>
          <p className="hero-copy">
            Configure o banco, as variáveis de ambiente e chame <code>/api/sync</code> para popular o dashboard com dados reais.
          </p>
        </section>
      </main>
    );
  }

  return <DashboardShell data={payload} />;
}
