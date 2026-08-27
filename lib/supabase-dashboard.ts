import type { ClientIntelligence, CustomerInsights, DashboardFilters, DashboardPayload, StudioInsights } from "@/lib/types";

const dashboardEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-dashboard-secure";
const studioEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-studio-insights";
const customerEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-customer-insights";
const clientIntelligenceEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-client-intelligence";

function searchParams(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.classType) params.set("classType", filters.classType);
  const value = params.toString();
  return value ? `?${value}` : "";
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, secret: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "x-kora-dashboard-secret": secret },
        cache: "no-store"
      });

      if (response.ok || response.status < 500) return response;
      lastError = new Error(`Supabase respondeu ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) await wait(350 * (attempt + 1));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha transitória ao carregar dados do Supabase.");
}

export async function getDashboardFromSupabase(
  filters: DashboardFilters = {}
): Promise<DashboardPayload> {
  const secret = process.env.KORA_DASHBOARD_READ_SECRET;
  if (!secret) throw new Error("Conexão segura com o Supabase não configurada.");

  const suffix = searchParams(filters);
  const request = (endpoint: string, withFilters = true) =>
    fetchWithRetry(`${endpoint}${withFilters ? suffix : ""}`, secret);

  const [dashboardResponse, studioResponse, customerResponse, intelligenceResponse] = await Promise.all([
    request(dashboardEndpoint),
    request(studioEndpoint),
    request(customerEndpoint),
    request(clientIntelligenceEndpoint, false)
  ]);

  if (!dashboardResponse.ok || !studioResponse.ok || !customerResponse.ok) {
    throw new Error("Não foi possível carregar os dados salvos no Supabase.");
  }

  const dashboard = (await dashboardResponse.json()) as DashboardPayload;
  const studio = (await studioResponse.json()) as StudioInsights;
  const customers = (await customerResponse.json()) as CustomerInsights;
  const clientIntelligence = intelligenceResponse.ok
    ? ((await intelligenceResponse.json()) as ClientIntelligence | null)
    : null;

  return {
    ...dashboard,
    studio,
    customers,
    clientIntelligence,
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
        note: `${studio.occupied} presenças em ${studio.capacity} vagas finalizadas`
      },
      {
        label: "Aulas realizadas",
        value: studio.totalSessions.toLocaleString("pt-BR"),
        note: `Somente finalizadas pela EVO${studio.cancelledSessions ? ` • ${studio.cancelledSessions} cancelada(s) excluída(s)` : ""}`
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
            status: `${studio.totalSessions} aulas finalizadas • ${studio.occupancy}% ocupação${studio.cancelledSessions ? ` • ${studio.cancelledSessions} cancelada(s) excluída(s)` : ""}`
          }
        : source
    )
  };
}