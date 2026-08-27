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

function saoPauloMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date());
}

function rangeFor(view: "month" | "quarter" | "year", month?: string, quarter?: string, year?: string) {
  const currentMonth = saoPauloMonth();
  const currentYear = currentMonth.slice(0, 4);

  if (view === "year") {
    const y = /^\d{4}$/.test(year ?? "") ? year! : currentYear;
    return { start: `${y}-01-01`, end: `${y}-12-31`, year: y };
  }

  if (view === "quarter") {
    const fallbackQ = Math.floor((Number(currentMonth.slice(5, 7)) - 1) / 3) + 1;
    const match = (quarter ?? "").match(/^(\d{4})-Q([1-4])$/);
    const y = match?.[1] ?? currentYear;
    const q = Number(match?.[2] ?? fallbackQ);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const endDay = new Date(Date.UTC(Number(y), endMonth, 0)).getUTCDate();
    return {
      start: `${y}-${String(startMonth).padStart(2, "0")}-01`,
      end: `${y}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
      quarter: `${y}-Q${q}`
    };
  }

  const selectedMonth = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth;
  const [y, m] = selectedMonth.split("-").map(Number);
  const endDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${selectedMonth}-01`,
    end: `${selectedMonth}-${String(endDay).padStart(2, "0")}`,
    month: selectedMonth
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const classType = value(params, "classType");
  const rawView = value(params, "view");
  const view = rawView === "quarter" || rawView === "year" ? rawView : "month";
  const range = rangeFor(view, value(params, "month"), value(params, "quarter"), value(params, "year"));

  const filters: DashboardFilters = {
    start: range.start,
    end: range.end,
    view,
    month: "month" in range ? range.month : undefined,
    quarter: "quarter" in range ? range.quarter : undefined,
    year: "year" in range ? range.year : undefined,
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
