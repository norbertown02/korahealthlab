import { NextRequest, NextResponse } from "next/server";
import { getEvoEnv } from "@/lib/env";
import type { EvoAggregatorCheckin, EvoEntry, EvoSale } from "@/lib/types";

const TOKEN = "kora-origin-audit-8f4d31b7";
const EVO_BASE = "https://evo-integracao-api.w12app.com.br";

function evoHeaders() {
  const env = getEvoEnv();
  const configuredToken = env.EVO_BASIC_TOKEN.trim();
  const token = configuredToken.toLowerCase().startsWith("basic ")
    ? configuredToken
    : `Basic ${Buffer.from(`${env.EVO_DNS}:${configuredToken}`).toString("base64")}`;
  return { Authorization: token, Accept: "text/plain" };
}

async function evoJson<T>(path: string, params: URLSearchParams) {
  const response = await fetch(`${EVO_BASE}${path}?${params.toString()}`, {
    headers: evoHeaders(),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`EVO ${path} HTTP ${response.status}: ${(await response.text()).slice(0,300)}`);
  }
  return (await response.json()) as T;
}

async function auditEntries(start: string, end: string) {
  const env = getEvoEnv();
  const all: EvoEntry[] = [];
  for (let skip = 0; skip < 20000; skip += 1000) {
    const params = new URLSearchParams({
      registerDateStart: `${start}T00:00:00`,
      registerDateEnd: `${end}T23:59:59`,
      take: "1000",
      skip: String(skip)
    });
    if (env.KORA_BRANCH_ID) params.set("idBranch", env.KORA_BRANCH_ID);
    const page = await evoJson<EvoEntry[]>("/api/v1/entries", params);
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

async function auditSales(start: string, end: string) {
  const env = getEvoEnv();
  const all: EvoSale[] = [];
  for (let skip = 0; skip < 20000; skip += 100) {
    const params = new URLSearchParams({
      dateSaleStart: start,
      dateSaleEnd: end,
      take: "100",
      skip: String(skip),
      showReceivables: "true"
    });
    if (env.KORA_BRANCH_ID) params.set("idBranch", env.KORA_BRANCH_ID);
    const page = await evoJson<EvoSale[]>("/api/v2/sales", params);
    all.push(...page);
    if (page.length < 100) break;
  }
  return all;
}

async function auditAggregators(start: string, end: string) {
  const env = getEvoEnv();
  const all: EvoAggregatorCheckin[] = [];
  for (let skip = 0; skip < 20000; skip += 1000) {
    const params = new URLSearchParams({
      DtStart: `${start}T00:00:00`,
      DtEnd: `${end}T23:59:59`,
      Skip: String(skip),
      Take: "1000"
    });
    if (env.KORA_BRANCH_ID) params.set("IdBranch", env.KORA_BRANCH_ID);
    const response = await evoJson<{ total: number; list: EvoAggregatorCheckin[] }>(
      "/api/v1/management/aggregators/checkins/search",
      params
    );
    const page = response.list ?? [];
    all.push(...page);
    if (page.length < 1000 || all.length >= response.total) break;
  }
  return all;
}

function interestingFields(value: unknown, path = "", out: Record<string, string | number | boolean | null> = {}) {
  if (!value || typeof value !== "object") return out;
  const obj = value as Record<string, unknown>;
  for (const [key, raw] of Object.entries(obj)) {
    const next = path ? `${path}.${key}` : key;
    const normalized = key.toLowerCase();
    const interesting = /(type|device|origin|sale|credit|credito|contract|contrato|plan|plano|access|entry|checkin|voucher|token|membership|subscription|description|descricao|item|product|produto|service|servico|source|fonte|reason|motivo|reposition|reposi|single|avul)/i.test(normalized);
    if (raw === null || ["string","number","boolean"].includes(typeof raw)) {
      if (interesting && !/(name|nome|email|phone|telefone|document|cpf)/i.test(key)) {
        out[next] = raw as string | number | boolean | null;
      }
    } else if (Array.isArray(raw)) {
      raw.slice(0, 8).forEach((item, index) => {
        if (item && typeof item === "object") interestingFields(item, `${next}[${index}]`, out);
      });
    } else {
      interestingFields(raw, next, out);
    }
  }
  return out;
}

function grouped(values: Array<string | null | undefined>) {
  const map = new Map<string, number>();
  for (const raw of values) {
    const key = (raw ?? "∅").trim() || "∅";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([value,count])=>({value,count}));
}

function signature(fields: Record<string, unknown>) {
  return JSON.stringify(fields, Object.keys(fields).sort());
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = request.nextUrl.searchParams.get("start") ?? "2026-06-01";
  const end = request.nextUrl.searchParams.get("end") ?? "2026-09-30";
  let entries: EvoEntry[] = [];
  let sales: EvoSale[] = [];
  let aggregators: EvoAggregatorCheckin[] = [];
  try {
    [entries, sales, aggregators] = await Promise.all([
      auditEntries(start, end),
      auditSales(start, end),
      auditAggregators(start, end)
    ]);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      configuredBaseProtocol: (() => {
        try { return new URL(getEvoEnv().EVO_API_BASE_URL).protocol; } catch { return "invalid"; }
      })()
    }, { status: 500 });
  }

  const entrySignatures = new Map<string, { fields: Record<string, unknown>; count: number }>();
  for (const row of entries) {
    const fields = {
      entry_type: row.entryType,
      device: row.device,
      ...interestingFields(row)
    };
    const key = signature(fields);
    const current = entrySignatures.get(key);
    if (current) current.count++;
    else entrySignatures.set(key, { fields, count: 1 });
  }

  const saleItemLabels: string[] = [];
  const saleSignatures = new Map<string, { fields: Record<string, unknown>; count: number }>();
  for (const row of sales) {
    const raw = row as Record<string, unknown> | null;
    const fields = interestingFields(raw);
    const key = signature(fields);
    const current = saleSignatures.get(key);
    if (current) current.count++;
    else saleSignatures.set(key, { fields, count: 1 });

    const items = (raw?.saleItens ?? raw?.saleItems ?? raw?.items) as Array<Record<string, unknown>> | undefined;
    for (const item of items ?? []) {
      const label = String(item.description ?? item.descricao ?? item.item ?? item.name ?? item.productName ?? item.serviceName ?? "").trim();
      if (label) saleItemLabels.push(label);
    }
  }

  const aggByMonth: Record<string, Record<string, number>> = {};
  for (const row of aggregators) {
    const month = String(row.checkinDate ?? "").slice(0,7) || "unknown";
    const name = String(row.aggregator ?? "unknown");
    aggByMonth[month] ??= {};
    aggByMonth[month][name] = (aggByMonth[month][name] ?? 0) + 1;
  }

  const entriesByMonth: Record<string, number> = {};
  for (const row of entries) {
    const month = String((row.date ?? row.dateTurn) ?? "").slice(0,7) || "unknown";
    entriesByMonth[month] = (entriesByMonth[month] ?? 0) + 1;
  }

  const salesByMonth: Record<string, number> = {};
  for (const row of sales) {
    const month = String((row.saleDate ?? row.saleDateServer) ?? "").slice(0,7) || "unknown";
    salesByMonth[month] = (salesByMonth[month] ?? 0) + 1;
  }

  return NextResponse.json({
    period: { start, end },
    counts: { entries: entries.length, sales: sales.length, aggregators: aggregators.length },
    entriesByMonth,
    salesByMonth,
    aggregatorsByMonth: aggByMonth,
    entryTypes: grouped(entries.map((r)=>r.entryType)),
    devices: grouped(entries.map((r)=>r.device)),
    entrySignatures: [...entrySignatures.values()].sort((a,b)=>b.count-a.count).slice(0,30),
    saleItemLabels: grouped(saleItemLabels).slice(0,100),
    saleSignatures: [...saleSignatures.values()].sort((a,b)=>b.count-a.count).slice(0,30)
  });
}
