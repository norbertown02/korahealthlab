import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1";
const ENDPOINTS = [
  "kora-dashboard-secure",
  "kora-studio-insights",
  "kora-customer-insights",
  "kora-client-intelligence"
];

function shape(value: unknown, depth = 0): unknown {
  if (depth > 3) return typeof value;
  if (Array.isArray(value)) {
    return { type: "array", length: value.length, sampleShape: value.length ? shape(value[0], depth + 1) : null };
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k,v] of Object.entries(obj)) {
      if (/name|email|phone|cpf|member|client|customer/i.test(k) && depth > 0) {
        out[k] = typeof v;
      } else {
        out[k] = shape(v, depth + 1);
      }
    }
    return out;
  }
  return typeof value;
}

function selected(endpoint:string, json:any) {
  if (endpoint === "kora-dashboard-secure") {
    return {
      originEntries: json?.originEntries ?? null,
      summaryCards: json?.summaryCards ?? null,
      filters: json?.filters ?? null,
      sources: json?.sources ?? null
    };
  }
  if (endpoint === "kora-client-intelligence") {
    return {
      source: json?.source ?? null,
      origin_method: json?.origin_method ?? null,
      period_start: json?.period_start ?? null,
      period_end: json?.period_end ?? null,
      identity_method: json?.identity_method ?? null,
      acquisition_monthly: json?.acquisition_monthly ?? null,
      origin_retention: json?.origin_retention ?? null
    };
  }
  if (endpoint === "kora-studio-insights") {
    return {
      filters: json?.filters ?? null,
      totalSessions: json?.totalSessions ?? null,
      modalities: json?.modalities ?? null
    };
  }
  return { keys: json && typeof json === "object" ? Object.keys(json) : [] };
}

export async function GET(req:NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== "validate-origin-sep-20260918-7d52a1") {
    return NextResponse.json({error:"not found"},{status:404});
  }
  const secret=process.env.KORA_DASHBOARD_READ_SECRET;
  if(!secret) return NextResponse.json({error:"missing dashboard secret"},{status:500});

  const qs="?start=2026-09-01&end=2026-09-30";
  const results=[];
  for(const endpoint of ENDPOINTS) {
    try {
      const url = endpoint === "kora-client-intelligence" ? `${BASE}/${endpoint}` : `${BASE}/${endpoint}${qs}`;
      const r=await fetch(url,{headers:{"x-kora-dashboard-secret":secret},cache:"no-store"});
      const text=await r.text();
      let json:any=null;
      try{json=JSON.parse(text)}catch{}
      results.push({
        endpoint,
        status:r.status,
        ok:r.ok,
        topKeys:json && typeof json==="object"?Object.keys(json):[],
        shape:json?shape(json):null,
        selected:json?selected(endpoint,json):null,
        errorSample:!r.ok?text.slice(0,200):null
      });
    } catch(e) {
      results.push({endpoint,ok:false,error:e instanceof Error?e.message:String(e)});
    }
  }
  return NextResponse.json({results});
}
