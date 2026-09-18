import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const BASE="https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1";

function collectNames(value: unknown, out:string[] = []) {
  if (out.length >= 20) return out;
  if (Array.isArray(value)) {
    for (const item of value.slice(0,100)) collectNames(item,out);
    return out;
  }
  if (value && typeof value==="object") {
    for (const [k,v] of Object.entries(value as Record<string,unknown>)) {
      if (typeof v==="string" && /^(name|nome|member_name|client_name|customer_name|person_name)$/i.test(k)) {
        out.push(v);
      } else if (v && typeof v==="object") collectNames(v,out);
      if(out.length>=20) break;
    }
  }
  return out;
}

async function probe(fn:string, secret:string) {
  try {
    const r=await fetch(`${BASE}/${fn}?start=2026-07-01&end=2026-07-31&month=2026-07&origin=ClassPass`,{
      headers:{"x-kora-dashboard-secret":secret},
      cache:"no-store"
    });
    const text=await r.text();
    let json:any=null; try{json=JSON.parse(text)}catch{}
    return {
      fn,
      status:r.status,
      ok:r.ok,
      size:text.length,
      keys:json&&typeof json==="object"?Object.keys(json):[],
      names:json?collectNames(json):[],
      error:!r.ok?text.slice(0,160):null
    };
  } catch(e) {
    return {fn,status:0,ok:false,error:e instanceof Error?e.message:String(e)};
  }
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-july-names-20260918-a92c") return NextResponse.json({error:"not found"},{status:404});
  const secret=process.env.KORA_DASHBOARD_READ_SECRET;
  if(!secret) return NextResponse.json({error:"missing secret"},{status:500});
  const names=[
    "kora-teacher-metrics",
    "kora-people","kora-members","kora-member-insights",
    "kora-client-details","kora-client-detail","kora-client-list",
    "kora-participants","kora-class-participants",
    "kora-origin-insights","kora-origin-details","kora-entry-origins","kora-client-origins",
    "kora-retention-details","kora-client-intelligence-detail","kora-client-intelligence-debug",
    "kora-entries","kora-sales","kora-data","kora-audit","kora-debug",
    "kora-evo-sync","kora-sync","kora-dashboard-sync"
  ];
  const results=await Promise.all(names.map(name=>probe(name,secret)));
  return NextResponse.json({results:results.filter(r=>r.status!==404)});
}
