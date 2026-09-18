import { NextRequest, NextResponse } from "next/server";
import { fetchEntries, fetchAggregatorCheckins, fetchSales } from "@/lib/evo-client";

export const dynamic = "force-dynamic";

function norm(v: unknown) {
  return String(v ?? "").trim();
}
function add(map: Record<string, number>, key: string) {
  const k = key || "(vazio)";
  map[k] = (map[k] ?? 0) + 1;
}
function top(map: Record<string, number>, n = 40) {
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function fields(rows: Array<Record<string, unknown>>) {
  const m: Record<string, number> = {};
  for (const row of rows) for (const k of Object.keys(row)) m[k]=(m[k]??0)+1;
  return top(m,100);
}
function itemName(item: Record<string, unknown>) {
  return norm(item.item ?? item.description ?? item.name ?? item.title ?? item.product ?? item.productName);
}
function saleText(sale: Record<string, unknown>) {
  const items = Array.isArray(sale.saleItens) ? sale.saleItens as Array<Record<string,unknown>> : [];
  return items.map(itemName).filter(Boolean).join(" | ").toLowerCase();
}

async function auditMonth(start:string,end:string) {
  const [entries, aggregators, sales] = await Promise.all([
    fetchEntries({dateStart:start,dateEnd:end}),
    fetchAggregatorCheckins({dateStart:start,dateEnd:end}),
    fetchSales({dateStart:start,dateEnd:end})
  ]);

  const entryTypes: Record<string,number> = {};
  const devices: Record<string,number> = {};
  const aggregatorsCount: Record<string,number> = {};
  const saleItems: Record<string,number> = {};
  const saleKeys: Record<string,number> = {};
  const entryRawKeys: Record<string,number> = {};
  const entrySampleValues: Record<string,Record<string,number>> = {};

  for (const e of entries as Array<Record<string,unknown>>) {
    add(entryTypes,norm(e.entryType));
    add(devices,norm(e.device));
    for (const k of Object.keys(e)) add(entryRawKeys,k);
    for (const [k,v] of Object.entries(e)) {
      if (["entryType","device","type","description","origin","accessType","method","source","reason"].some(x=>k.toLowerCase().includes(x.toLowerCase()))) {
        entrySampleValues[k] ??= {};
        add(entrySampleValues[k], norm(v));
      }
    }
  }
  for (const a of aggregators as Array<Record<string,unknown>>) add(aggregatorsCount,norm(a.aggregator));
  for (const s of sales as Array<Record<string,unknown>>) {
    for (const k of Object.keys(s)) add(saleKeys,k);
    const items = Array.isArray(s.saleItens) ? s.saleItens as Array<Record<string,unknown>> : [];
    for (const item of items) add(saleItems,itemName(item));
  }

  const salesByMember = new Map<number, Array<Record<string,unknown>>>();
  for (const s of sales as Array<Record<string,unknown>>) {
    const id = Number(s.idMember ?? 0);
    if (!id) continue;
    const arr=salesByMember.get(id)??[];
    arr.push(s); salesByMember.set(id,arr);
  }

  let entriesWithAnySaleMember=0;
  let entriesWithSameDaySale=0;
  let entriesWithPriorSale30d=0;
  let entriesWithKoraKeywordSale30d=0;
  const keywordBuckets: Record<string,number>={};
  const entrySaleExamples: Array<Record<string,unknown>>=[];

  for (const e of entries as Array<Record<string,unknown>>) {
    const id=Number(e.idMember??0);
    if(!id) continue;
    const list=salesByMember.get(id)??[];
    if(list.length) entriesWithAnySaleMember++;
    const ed=new Date(String(e.date??e.dateTurn??""));
    let same=false, prior=false, keyword=false;
    for (const s of list) {
      const sd=new Date(String(s.saleDate??s.saleDateServer??""));
      if(Number.isNaN(ed.getTime())||Number.isNaN(sd.getTime())) continue;
      const diff=(ed.getTime()-sd.getTime())/86400000;
      if(Math.abs(diff)<1) same=true;
      if(diff>=0 && diff<=30) {
        prior=true;
        const txt=saleText(s);
        if(/avul|repos|totem|diaria|diária|aula|credito|crédito|sess|day pass|drop/.test(txt)) {
          keyword=true;
          for (const token of ["avul","repos","totem","diaria","diária","aula","credito","crédito","sess","day pass","drop"]) {
            if(txt.includes(token)) add(keywordBuckets,token);
          }
        }
      }
    }
    if(same) entriesWithSameDaySale++;
    if(prior) entriesWithPriorSale30d++;
    if(keyword) entriesWithKoraKeywordSale30d++;
  }

  return {
    period:{start,end},
    totals:{entries:entries.length,aggregators:aggregators.length,sales:sales.length},
    entryTypes:top(entryTypes),
    devices:top(devices),
    aggregators:top(aggregatorsCount),
    saleItems:top(saleItems,80),
    entryFields:top(entryRawKeys,100),
    saleFields:top(saleKeys,100),
    entryCandidateFields:Object.fromEntries(Object.entries(entrySampleValues).map(([k,v])=>[k,top(v,30)])),
    matchability:{
      entriesWithMemberId: entries.filter((e:any)=>Number(e.idMember??0)>0).length,
      entriesWithAnySaleMember,
      entriesWithSameDaySale,
      entriesWithPriorSale30d,
      entriesWithKoraKeywordSale30d,
      keywordBuckets:top(keywordBuckets)
    }
  };
}

export async function GET(req: NextRequest) {
  if(req.nextUrl.searchParams.get("key")!=="origin-audit-20260918-7f1c9d") return NextResponse.json({error:"not found"},{status:404});
  try {
    const [aug,sep]=await Promise.all([
      auditMonth("2026-08-01","2026-08-31"),
      auditMonth("2026-09-01","2026-09-30")
    ]);
    return NextResponse.json({aug,sep});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
