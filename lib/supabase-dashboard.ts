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
const retryableStatus = (status: number) => status === 408 || status === 425 || status === 429 || status >= 500;

async function fetchWithRetry(url: string, secret: string, attempts = 4) {
  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch(url, {
        headers: { "x-kora-dashboard-secret": secret },
        cache: "no-store",
        signal: controller.signal
      });

      clearTimeout(timeout);
      lastResponse = response;

      if (response.ok || !retryableStatus(response.status)) return response;
      lastError = new Error(`Supabase respondeu ${response.status}`);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }

    if (attempt < attempts - 1) {
      const delays = [300, 700, 1_200, 1_800];
      await wait(delays[Math.min(attempt, delays.length - 1)]);
    }
  }

  if (lastResponse) return lastResponse;

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha transitória ao carregar dados do Supabase.");
}

async function optionalJson<T>(url: string, secret: string, label: string): Promise<T | null> {
  try {
    const response = await fetchWithRetry(url, secret, 4);
    if (!response.ok) {
      console.warn(`[Kora dashboard] ${label} indisponível: HTTP ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[Kora dashboard] ${label} falhou no carregamento inicial`, error);
    return null;
  }
}

export async function getDashboardPeriodFromSupabase(
  filters: DashboardFilters = {}
): Promise<DashboardPayload> {
  const secret = process.env.KORA_DASHBOARD_READ_SECRET;
  if (!secret) throw new Error("Conexão segura com o Supabase não configurada.");

  const response = await fetchWithRetry(`${dashboardEndpoint}${searchParams(filters)}`, secret, 4);
  if (!response.ok) throw new Error(`Não foi possível carregar o período comparativo (${response.status}).`);
  return (await response.json()) as DashboardPayload;
}

export async function getDashboardFromSupabase(
  filters: DashboardFilters = {}
): Promise<DashboardPayload> {
  const secret = process.env.KORA_DASHBOARD_READ_SECRET;
  if (!secret) throw new Error("Conexão segura com o Supabase não configurada.");

  const suffix = searchParams(filters);

  // The core dashboard is the only mandatory request. On a cold first access,
  // auxiliary Edge Functions may wake at different speeds; they must never
  // take the whole report down.
  const dashboardResponse = await fetchWithRetry(`${dashboardEndpoint}${suffix}`, secret, 5);
  if (!dashboardResponse.ok) {
    throw new Error(`Não foi possível carregar os dados principais do Supabase (${dashboardResponse.status}).`);
  }

  const dashboard = (await dashboardResponse.json()) as DashboardPayload;

  // Warm/enrich only after the core response succeeded. This avoids opening
  // four cold Edge Function requests at the exact same instant on first load.
  const [studio, customers, clientIntelligence] = await Promise.all([
    optionalJson<StudioInsights>(`${studioEndpoint}${suffix}`, secret, "studio insights"),
    optionalJson<CustomerInsights>(`${customerEndpoint}${suffix}`, secret, "customer insights"),
    optionalJson<ClientIntelligence | null>(clientIntelligenceEndpoint, secret, "client intelligence")
  ]);

  const base: DashboardPayload = {
    ...dashboard,
    studio: studio ?? dashboard.studio,
    customers: customers ?? dashboard.customers,
    clientIntelligence: clientIntelligence ?? dashboard.clientIntelligence ?? null
  };

  // If the studio enrichment is temporarily unavailable, the core report is
  // still fully usable with the values already returned by the main endpoint.
  if (!studio) return base;

  return {
    ...base,
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
