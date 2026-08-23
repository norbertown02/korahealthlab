import type { DashboardPayload } from "@/lib/types";

const dashboardEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-dashboard-secure";
const teacherEndpoint =
  "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-teacher-metrics";

type TeacherMetrics = {
  teachers: DashboardPayload["teachers"];
  sessions: number;
  overallOccupancy: number;
};

export async function getDashboardFromSupabase(): Promise<DashboardPayload> {
  const secret = process.env.KORA_DASHBOARD_READ_SECRET;
  if (!secret) {
    throw new Error("Conexão segura com o Supabase não configurada.");
  }

  const request = (endpoint: string) =>
    fetch(endpoint, {
      headers: { "x-kora-dashboard-secret": secret },
      cache: "no-store"
    });

  const [dashboardResponse, teacherResponse] = await Promise.all([
    request(dashboardEndpoint),
    request(teacherEndpoint)
  ]);

  if (!dashboardResponse.ok || !teacherResponse.ok) {
    throw new Error("Não foi possível carregar os dados salvos no Supabase.");
  }

  const dashboard = (await dashboardResponse.json()) as DashboardPayload;
  const teacherMetrics = (await teacherResponse.json()) as TeacherMetrics;

  return {
    ...dashboard,
    teachers: teacherMetrics.teachers,
    summaryCards: [
      ...dashboard.summaryCards,
      {
        label: "Ocupação das aulas",
        value: `${teacherMetrics.overallOccupancy}%`,
        note: `${teacherMetrics.sessions} sessões com professora e capacidade registradas`
      }
    ],
    actions: teacherMetrics.teachers.slice(0, 3).map((teacher) => ({
      title: `${teacher.name} • ${teacher.occupancy}% de ocupação`,
      tag: "professora",
      detail: `${teacher.classes} aulas registradas no período.`
    })),
    sources: dashboard.sources.map((source) =>
      source.name === "Professores e ocupação"
        ? {
            name: "Professores e ocupação",
            endpoint: "Supabase • fact_class_sessions",
            usage: "Aulas, capacidade e ocupação por professora",
            status: `${teacherMetrics.sessions} sessões • ${teacherMetrics.teachers.length} professoras`
          }
        : source
    )
  };
}
