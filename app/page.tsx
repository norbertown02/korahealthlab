import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard-shell";
import { KoraLogo } from "@/components/kora-logo";
import { LoginForm } from "@/components/login-form";
import { getDashboardFromSupabase, getDashboardPeriodFromSupabase } from "@/lib/supabase-dashboard";
import type { DashboardFilters, DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "kora_session";
const SESSION_MESSAGE = "kora-dashboard-session-v1";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sessionToken(password: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_MESSAGE)
  );
  return toBase64Url(new Uint8Array(signature));
}

async function hasValidSession() {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;
  const store = await cookies();
  const current = store.get(SESSION_COOKIE)?.value;
  return current === await sessionToken(password);
}

function LoginScreen() {
  return (
    <main className="kora-auth-shell">
      <section className="kora-auth-panel">
        <div className="kora-auth-brand">
          <div className="kora-auth-logo-wrap"><KoraLogo className="kora-auth-logo" /></div>
          <p>Kora Health Lab</p>
        </div>
        <div className="kora-auth-copy">
          <span>Private Studio Intelligence</span>
          <h1>Sua operação,<br /><i>em uma visão.</i></h1>
          <p>Acesse o painel de gestão do Kora para acompanhar movimento, receita, professoras e recorrência.</p>
        </div>
        <LoginForm />
        <small className="kora-auth-foot">Acesso privado · Kora Health Lab</small>
      </section>
      <aside className="kora-auth-art" aria-hidden="true">
        <div className="kora-auth-orbit orbit-one" />
        <div className="kora-auth-orbit orbit-two" />
        <div className="kora-auth-orbit orbit-three" />
        <span>MOVIMENTO<br />COM INTENÇÃO</span>
      </aside>
    </main>
  );
}

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

function previousPeriodRange(view: "month" | "quarter" | "year", start: string) {
  const currentStart = new Date(`${start}T00:00:00Z`);
  const year = currentStart.getUTCFullYear();
  const monthIndex = currentStart.getUTCMonth();

  if (view === "year") {
    const previousYear = year - 1;
    return { start: `${previousYear}-01-01`, end: `${previousYear}-12-31` };
  }

  const spanMonths = view === "quarter" ? 3 : 1;
  const previousStart = new Date(Date.UTC(year, monthIndex - spanMonths, 1));
  const previousYear = previousStart.getUTCFullYear();
  const previousMonth = previousStart.getUTCMonth();
  const previousEnd = new Date(Date.UTC(previousYear, previousMonth + spanMonths, 0));

  return {
    start: previousStart.toISOString().slice(0, 10),
    end: previousEnd.toISOString().slice(0, 10)
  };
}

async function loadDashboardWithRecovery(filters: DashboardFilters) {
  try {
    return await getDashboardFromSupabase(filters);
  } catch (error) {
    // A cold Edge Function can occasionally fail the very first document load.
    // Recover once inside the server render instead of making the user refresh.
    console.warn("[Kora dashboard] primeira carga falhou; repetindo internamente", error);
    await new Promise((resolve) => setTimeout(resolve, 900));
    return getDashboardFromSupabase(filters);
  }
}

export default async function HomePage({ searchParams }: PageProps) {
  if (!(await hasValidSession())) return <LoginScreen />;

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

  const previousRange = previousPeriodRange(view, range.start);
  const previousFilters: DashboardFilters = {
    start: previousRange.start,
    end: previousRange.end,
    classType: filters.classType
  };

  let payload: DashboardPayload | null = null;
  let previousPayload: DashboardPayload | null = null;
  try {
    // Load the current report first. The previous-period comparison is useful,
    // but it should not compete with the main report during a cold first access.
    payload = await loadDashboardWithRecovery(filters);
    previousPayload = await getDashboardPeriodFromSupabase(previousFilters).catch((error) => {
      console.warn("[Kora dashboard] comparativo anterior indisponível nesta carga", error);
      return null;
    });
  } catch (error) {
    console.error("[Kora dashboard] falha definitiva ao carregar o recorte", error);
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

  return (
    <DashboardShell
      data={payload}
      filters={filters}
      previousPeriod={previousPayload ? {
        weekday: previousPayload.weekday,
        start: previousRange.start,
        end: previousRange.end
      } : null}
    />
  );
}
