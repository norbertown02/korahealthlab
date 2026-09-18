import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const ENDPOINT="https://ovquzagoddwgqixtmkbr.supabase.co/functions/v1/kora-client-intelligence";

function collectNameLike(value: unknown, path="", out: Array<{path:string,value:string}> = []) {
  if (out.length >= 30) return out;
  if (Array.isArray(value)) {
    for (let i=0;i<Math.min(value.length,50);i++) collectNameLike(value[i], `${path}[${i}]`, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [k,v] of Object.entries(value as Record<string,unknown>)) {
      const p=path? `${path}.${k}`:k;
      if (typeof v==="string" && /(name|nome|person|client|member|customer)/i.test(k)) {
        out.push({path:p,value:v});
        if(out.length>=30) return out;
      } else if (typeof v==="object" && v!==null) collectNameLike(v,p,out);
    }
  }
  return out;
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-july-names-20260918-a92c") return NextResponse.json({error:"not found"},{status:404});
  const secret=process.env.KORA_DASHBOARD_READ_SECRET;
  if(!secret) return NextResponse.json({error:"missing secret"},{status:500});
  const variants=[
    "",
    "?debug=1",
    "?details=1",
    "?raw=1",
    "?include_people=1",
    "?includePeople=true",
    "?month=2026-07",
    "?month=2026-07&origin=ClassPass",
    "?start=2026-07-01&end=2026-07-31",
    "?start=2026-07-01&end=2026-07-31&origin=ClassPass&details=1"
  ];
  const results=[];
  for(const suffix of variants){
    try{
      const r=await fetch(ENDPOINT+suffix,{headers:{"x-kora-dashboard-secret":secret},cache:"no-store"});
      const text=await r.text();
      let json:any=null; try{json=JSON.parse(text)}catch{}
      results.push({
        suffix,
        status:r.status,
        keys:json&&typeof json==="object"?Object.keys(json):[],
        names:json?collectNameLike(json):[],
        size:text.length
      });
    }catch(e){
      results.push({suffix,error:e instanceof Error?e.message:String(e)});
    }
  }
  return NextResponse.json({results});
}
