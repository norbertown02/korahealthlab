import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardFromSupabase } from "@/lib/supabase-dashboard";
import type { DashboardFilters, DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] : item;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const classType = value(params, "classType");
  const filters: DashboardFilters = {
    start: value(params, "start"),
    end: value(params, "end"),
    classType: classType === "hot-sculpt" || classType === "yoga" ? classType : "all"
  };

  let payload: DashboardPayload | null = null;
  try {
    payload = await getDashboardFromSupabase(filters);
  } catch {
    return (
      <main className="page-shell">
        <section className="loading-shell">
          <p className="eyebrow">Kora Health Lab</p>
          <h1>Não foi possível carregar este recorte.</h1>
          <p>Atualize a página em instantes. O painel consulta somente o histórico salvo no Supabase.</p>
        </section>
      </main>
    );
  }

  return <DashboardShell data={payload} filters={filters} />;
}
