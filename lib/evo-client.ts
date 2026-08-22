import { getEnv } from "@/lib/env";
import type { EvoAggregatorCheckin, EvoEntry, EvoSale, SyncWindow } from "@/lib/types";

function authHeader() {
  const env = getEnv();
  const token = env.EVO_BASIC_TOKEN.toLowerCase().startsWith("basic ")
    ? env.EVO_BASIC_TOKEN
    : `Basic ${env.EVO_BASIC_TOKEN}`;

  return {
    Authorization: token,
    Accept: "application/json"
  };
}

async function fetchEvo<T>(path: string, params: URLSearchParams) {
  const env = getEnv();
  const response = await fetch(`${env.EVO_API_BASE_URL}${path}?${params.toString()}`, {
    headers: authHeader(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`EVO ${path} falhou com status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchEntries(window: SyncWindow) {
  const env = getEnv();
  const all: EvoEntry[] = [];
  let skip = 0;
  const take = 1000;

  while (true) {
    const params = new URLSearchParams({
      registerDateStart: `${window.dateStart}T00:00:00`,
      registerDateEnd: `${window.dateEnd}T23:59:59`,
      take: String(take),
      skip: String(skip)
    });

    if (env.KORA_BRANCH_ID) {
      params.set("idBranch", env.KORA_BRANCH_ID);
    }

    const page = await fetchEvo<EvoEntry[]>("/api/v1/entries", params);
    all.push(...page);

    if (page.length < take) {
      break;
    }

    skip += take;
  }

  return all;
}

export async function fetchAggregatorCheckins(window: SyncWindow) {
  const env = getEnv();
  const params = new URLSearchParams({
    DtStart: `${window.dateStart}T00:00:00`,
    DtEnd: `${window.dateEnd}T23:59:59`,
    Skip: "0",
    Take: "1000"
  });

  if (env.KORA_BRANCH_ID) {
    params.set("IdBranch", env.KORA_BRANCH_ID);
  }

  const response = await fetchEvo<{ total: number; list: EvoAggregatorCheckin[] }>(
    "/api/v1/management/aggregators/checkins/search",
    params
  );

  return response.list ?? [];
}

export async function fetchSales(window: SyncWindow) {
  const env = getEnv();
  const all: EvoSale[] = [];
  let skip = 0;
  const take = 100;

  while (true) {
    const params = new URLSearchParams({
      dateSaleStart: window.dateStart,
      dateSaleEnd: window.dateEnd,
      take: String(take),
      skip: String(skip),
      showReceivables: "true"
    });

    if (env.KORA_BRANCH_ID) {
      params.set("idBranch", env.KORA_BRANCH_ID);
    }

    const page = await fetchEvo<EvoSale[]>("/api/v2/sales", params);
    all.push(...page);

    if (page.length < take) {
      break;
    }

    skip += take;
  }

  return all;
}
