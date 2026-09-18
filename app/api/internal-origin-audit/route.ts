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
  for (let skip = 0; skip < 20000; skip += 500) {
    const params = new URLSearchParams({
      DtStart: `${start}T00:00:00`,
      DtEnd: `${end}T23:59:59`,
      Skip: String(skip),
      Take: "500"
    });
    if (env.KORA_BRANCH_ID) params.set("IdBranch", env.KORA_BRANCH_ID);
    const response = await evoJson<{ total: number; list: EvoAggregatorCheckin[] }>(
      "/api/v1/management/aggregators/checkins/search",
      params
    );
    const page = response.list ?? [];
    all.push(...page);
    if (page.length < 500 || all.length >= response.total) break;
  }
  return all;
}

function dateOnly(value?: string | null) {
  return (value ?? "").slice(0, 10);
}

function normalizedName(value?: string | null) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function classSessionsFromSale(sale: EvoSale) {
  const entitlements: Array<{ start: string; sessions: number; unlimited: boolean; label: string }> = [];
  for (const item of sale.saleItens ?? []) {
    const label = String(item.description ?? item.item ?? "");
    const norm = label.toLowerCase();
    if (/nutric|massag|ayur|consulta/.test(norm)) continue;
    const start = String((item as Record<string, unknown>).membershipStartDate ?? sale.saleDate ?? sale.saleDateServer ?? "").slice(0,10);
    if (!start) continue;
    if (/ilimitad/.test(norm)) {
      entitlements.push({ start, sessions: 0, unlimited: true, label });
      continue;
    }
    const sessionMatch = label.match(/\((\d+)\s*sess[oõ]es?\)/i);
    const creditMatch = label.match(/(\d+)\s*cr[eé]ditos?/i);
    const sessions = sessionMatch ? Number(sessionMatch[1]) : creditMatch ? Number(creditMatch[1]) : 0;
    if (sessions > 0) entitlements.push({ start, sessions, unlimited: false, label });
  }
  return entitlements;
}

function classifyOrigins(entries: EvoEntry[], aggregators: EvoAggregatorCheckin[], salesHistory: EvoSale[]) {
  const aggPools = new Map<string, string[]>();
  const aggNamePools = new Map<string, string[]>();

  for (const agg of aggregators) {
    const day = dateOnly(agg.checkinDate);
    const origin = String(agg.aggregator ?? "unknown");
    if (agg.idMember != null && day) {
      const key = `${agg.idMember}|${day}`;
      const list = aggPools.get(key) ?? [];
      list.push(origin);
      aggPools.set(key, list);
    }
    const name = normalizedName(agg.name);
    if (name && day) {
      const key = `${name}|${day}`;
      const list = aggNamePools.get(key) ?? [];
      list.push(origin);
      aggNamePools.set(key, list);
    }
  }

  const direct: EvoEntry[] = [];
  const aggregatorMatched: Record<string, number> = {};
  let unmatchedAggregatorEntries = 0;

  const sortedEntries = [...entries].sort((a,b)=>
    String(a.date ?? a.dateTurn ?? "").localeCompare(String(b.date ?? b.dateTurn ?? ""))
  );

  for (const entry of sortedEntries) {
    const day = dateOnly(entry.date ?? entry.dateTurn);
    let origin: string | undefined;

    if (entry.idMember != null && day) {
      const key = `${entry.idMember}|${day}`;
      const list = aggPools.get(key);
      if (list?.length) origin = list.shift();
    }

    if (!origin) {
      const name = normalizedName(entry.nameMember ?? entry.nameProspect);
      if (name && day) {
        const key = `${name}|${day}`;
        const list = aggNamePools.get(key);
        if (list?.length) origin = list.shift();
      }
    }

    if (origin) {
      aggregatorMatched[origin] = (aggregatorMatched[origin] ?? 0) + 1;
    } else {
      direct.push(entry);
    }
  }

  for (const list of aggPools.values()) unmatchedAggregatorEntries += list.length;

  const entitlementsByMember = new Map<number, Array<{ start: string; sessions: number; unlimited: boolean; label: string }>>();
  for (const sale of salesHistory) {
    if (sale.idMember == null) continue;
    const items = classSessionsFromSale(sale);
    if (!items.length) continue;
    const current = entitlementsByMember.get(sale.idMember) ?? [];
    current.push(...items);
    entitlementsByMember.set(sale.idMember, current);
  }
  for (const items of entitlementsByMember.values()) items.sort((a,b)=>a.start.localeCompare(b.start));

  let kora = 0;
  let noKoraEntitlement = 0;
  let sameDayOrEarlierSale = 0;
  const unresolvedByMonth: Record<string, number> = {};

  for (const entry of direct) {
    const day = dateOnly(entry.date ?? entry.dateTurn);
    const items = entry.idMember != null ? (entitlementsByMember.get(entry.idMember) ?? []) : [];
    let matched = false;

    for (const item of items) {
      if (item.start > day) break;
      if (item.unlimited) {
        matched = true;
        break;
      }
      if (item.sessions > 0) {
        item.sessions -= 1;
        matched = true;
        break;
      }
    }

    if (matched) {
      kora++;
      sameDayOrEarlierSale++;
    } else {
      noKoraEntitlement++;
      const month = day.slice(0,7) || "unknown";
      unresolvedByMonth[month] = (unresolvedByMonth[month] ?? 0) + 1;
    }
  }

  return {
    totalEntries: entries.length,
    aggregatorMatched,
    directEntries: direct.length,
    koraByEntitlement: kora,
    unresolvedDirect: noKoraEntitlement,
    unresolvedByMonth,
    unmatchedAggregatorRecords: unmatchedAggregatorEntries
  };
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

  if (request.nextUrl.searchParams.get("mode") === "swagger-detail") {
    const apiPath = request.nextUrl.searchParams.get("apiPath") ?? "";
    const response = await fetch(`${EVO_BASE}/swagger/v1/swagger.json`, { headers: evoHeaders(), cache: "no-store" });
    const json = await response.json() as {
      paths?: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    };
    const operation = json.paths?.[apiPath] ?? null;
    const refs = new Set<string>();
    const scan = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach(scan); return; }
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (key === "$ref" && typeof item === "string" && item.startsWith("#/components/schemas/")) {
          refs.add(item.split("/").pop() ?? "");
        } else scan(item);
      }
    };
    scan(operation);
    const schemas: Record<string, unknown> = {};
    for (const name of refs) {
      if (name && json.components?.schemas?.[name]) schemas[name] = json.components.schemas[name];
    }
    return NextResponse.json({ apiPath, operation, schemas });
  }

  if (request.nextUrl.searchParams.get("mode") === "swagger") {
    const candidates = ["/swagger/v1/swagger.json", "/swagger/swagger.json"];
    const results: Array<Record<string, unknown>> = [];
    for (const path of candidates) {
      try {
        const response = await fetch(`${EVO_BASE}${path}`, { headers: evoHeaders(), cache: "no-store" });
        const text = await response.text();
        let matchedPaths: string[] = [];
        try {
          const json = JSON.parse(text) as { paths?: Record<string, unknown> };
          matchedPaths = Object.keys(json.paths ?? {}).filter((key) =>
            /(class|participant|membership|schedule|agenda|reservation|booking|member)/i.test(key)
          );
        } catch {}
        results.push({ path, status: response.status, matchedPaths, sample: text.slice(0, 120) });
      } catch (error) {
        results.push({ path, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return NextResponse.json({ results });
  }

  const start = request.nextUrl.searchParams.get("start") ?? "2026-06-01";
  const end = request.nextUrl.searchParams.get("end") ?? "2026-09-30";
  let entries: EvoEntry[] = [];
  let sales: EvoSale[] = [];
  let salesHistory: EvoSale[] = [];
  let aggregators: EvoAggregatorCheckin[] = [];
  try {
    [entries, sales, salesHistory, aggregators] = await Promise.all([
      auditEntries(start, end),
      auditSales(start, end),
      auditSales("2026-01-01", end),
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
    aggregatorStatuses: grouped(aggregators.map((r)=>r.status)),
    entrySignatures: [...entrySignatures.values()].sort((a,b)=>b.count-a.count).slice(0,30),
    saleItemLabels: grouped(saleItemLabels).slice(0,100),
    saleSignatures: [...saleSignatures.values()].sort((a,b)=>b.count-a.count).slice(0,30),
    classificationAudit: classifyOrigins(entries, aggregators, salesHistory)
  });
}
