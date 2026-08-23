import type { DashboardFilters, DashboardPayload, StudioInsights } from "@/lib/types";

const dashboardEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-dashboard-secure";
const studioEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-studio-insights";

function searchParams(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.classType) params.set("classType", filters.classType);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function getDashboardFromSupabase(
  filters: DashboardFilters = {}
): Promise<DashboardPayload> {
  const secret = process.env.KORA_DASHBOARD_READ_SECRET;
  if (!secret) throw new Error("Conexão segura com o Supabase não configurada.");

  const suffix = searchParams(filters);
  const request = (endpoint: string) =>
    fetch(`${endpoint}${suffix}`, {
      headers: { "x-kora-dashboard-secret": secret },
      cache: "no-store"
    });

  const [dashboardResponse, studioResponse] = await Promise.all([
    request(dashboardEndpoint),
    request(studioEndpoint)
  ]);

  if (!dashboardResponse.ok || !studioResponse.ok) {
    throw new Error("Não foi possível carregar os dados salvos no Supabase.");
  }

  const dashboard = (await dashboardResponse.json()) as DashboardPayload;
  const studio = (await studioResponse.json()) as StudioInsights;

  return {
    ...dashboard,
    studio,
    teachers: studio.teachers.map((teacher) => ({
      name: teacher.name,
      classes: teacher.classes,
      occupancy: teacher.occupancy,
      returnRate: 0
    })),
    summaryCards: [
      ...dashboard.summaryCards.slice(0, 4),
      {
        label: "Ocupação das aulas",
        value: `${studio.occupancy}%`,
        note: `${studio.occupied} presenças em ${studio.capacity} vagas`
      },
      {
        label: "Aulas realizadas",
        value: studio.totalSessions.toLocaleString("pt-BR"),
        note: "Turmas com agenda, capacidade e modalidade"
      },
      ...dashboard.summaryCards.slice(4)
    ],
    actions: studio.opportunities.map((item) => ({
      title: item.title,
      tag: item.tone,
      detail: item.detail
    })),
    sources: dashboard.sources.map((source) =>
      source.name === "Professores e ocupação"
        ? {
            name: "Agenda e ocupação",
            endpoint: "Supabase • fact_class_sessions",
            usage: "Aulas, modalidade, vagas e professoras",
            status: `${studio.totalSessions} sessões • ${studio.occupancy}% ocupação`
          }
        : source
    )
  };
}
