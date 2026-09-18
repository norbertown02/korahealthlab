import { NextRequest, NextResponse } from "next/server";
import { getEvoEnv } from "@/lib/env";
import type { EvoAggregatorCheckin, EvoEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
const EVO_BASE = "https://evo-integracao-api.w12app.com.br";

function headers() {
  const env=getEvoEnv();
  const configured=env.EVO_BASIC_TOKEN.trim();
  const token=configured.toLowerCase().startsWith("basic ")
    ? configured
    : `Basic ${Buffer.from(`${env.EVO_DNS}:${configured}`).toString("base64")}`;
  return {Authorization:token,Accept:"text/plain"};
}
async function evoJson<T>(path:string,params:URLSearchParams){
  const r=await fetch(`${EVO_BASE}${path}?${params.toString()}`,{headers:headers(),cache:"no-store"});
  if(!r.ok) throw new Error(`EVO ${path} HTTP ${r.status}: ${(await r.text()).slice(0,220)}`);
  return await r.json() as T;
}
function day(v?:string|null){return (v??"").slice(0,10);}
function name(v?:string|null){return (v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();}

async function entries(start:string,end:string){
  const env=getEvoEnv(); const all:EvoEntry[]=[];
  for(let skip=0;skip<20000;skip+=1000){
    const p=new URLSearchParams({registerDateStart:`${start}T00:00:00`,registerDateEnd:`${end}T23:59:59`,take:"1000",skip:String(skip)});
    if(env.KORA_BRANCH_ID)p.set("idBranch",env.KORA_BRANCH_ID);
    const page=await evoJson<EvoEntry[]>("/api/v1/entries",p); all.push(...page); if(page.length<1000)break;
  } return all;
}
async function aggs(start:string,end:string){
  const env=getEvoEnv(); const all:EvoAggregatorCheckin[]=[];
  for(let skip=0;skip<20000;skip+=500){
    const p=new URLSearchParams({DtStart:`${start}T00:00:00`,DtEnd:`${end}T23:59:59`,Skip:String(skip),Take:"500"});
    if(env.KORA_BRANCH_ID)p.set("IdBranch",env.KORA_BRANCH_ID);
    const r=await evoJson<{total:number;list:EvoAggregatorCheckin[]}>("/api/v1/management/aggregators/checkins/search",p);
    const page=r.list??[]; all.push(...page); if(page.length<500||all.length>=r.total)break;
  } return all;
}

type Schedule={idAtividadeSessao?:number;activityDate?:string};
type Enrollment={idMember?:number|null;name?:string|null;idSaleItem?:number|null;replacement?:boolean;removed?:boolean;suspended?:boolean;status?:number};
type Detail={idActivitySession?:number;date?:string|null;status?:number;enrollments?:Enrollment[]|null};

async function participantPools(start:string,end:string){
  const env=getEvoEnv();
  const sessions=new Map<number,Schedule>();
  const cursor=new Date(`${start}T00:00:00Z`), stop=new Date(`${end}T00:00:00Z`);
  while(cursor<=stop){
    const d=cursor.toISOString().slice(0,10);
    const p=new URLSearchParams({date:`${d}T00:00:00`,showFullWeek:"true",onlyAvailables:"false",take:"500"});
    if(env.KORA_BRANCH_ID)p.set("idBranch",env.KORA_BRANCH_ID);
    const rows=await evoJson<Schedule[]>("/api/v1/activities/schedule",p);
    for(const row of rows){
      const dd=day(row.activityDate);
      if(row.idAtividadeSessao&&dd>=start&&dd<=end)sessions.set(row.idAtividadeSessao,row);
    }
    cursor.setUTCDate(cursor.getUTCDate()+7);
  }

  const member=new Map<string,Array<"sale"|"replacement"|"no-sale">>();
  const names=new Map<string,Array<"sale"|"replacement"|"no-sale">>();
  const stats={sessions:sessions.size,details:0,totalEnrollments:0,sale:0,replacement:0,noSale:0,removed:0};

  const ids=[...sessions.keys()];
  for(let i=0;i<ids.length;i+=10){
    const batch=ids.slice(i,i+10);
    const details=await Promise.all(batch.map(async id=>{
      try{return await evoJson<Detail>("/api/v1/activities/schedule/detail",new URLSearchParams({idActivitySession:String(id)}));}
      catch{return null;}
    }));
    for(const detail of details){
      if(!detail)continue; stats.details++;
      const sd=day(detail.date)||day(sessions.get(detail.idActivitySession??-1)?.activityDate);
      for(const p of detail.enrollments??[]){
        stats.totalEnrollments++;
        if(p.removed){stats.removed++;continue;}
        const cls:"sale"|"replacement"|"no-sale"=p.idSaleItem!=null?"sale":p.replacement?"replacement":"no-sale";
        stats[cls==="sale"?"sale":cls==="replacement"?"replacement":"noSale"]++;
        if(p.idMember!=null&&sd){const k=`${p.idMember}|${sd}`;const a=member.get(k)??[];a.push(cls);member.set(k,a);}
        const nn=name(p.name); if(nn&&sd){const k=`${nn}|${sd}`;const a=names.get(k)??[];a.push(cls);names.set(k,a);}
      }
    }
  }
  return {member,names,stats};
}

async function audit(start:string,end:string){
  const [es,as,pp]=await Promise.all([entries(start,end),aggs(start,end),participantPools(start,end)]);
  const aggMember=new Map<string,string[]>(), aggName=new Map<string,string[]>();
  const aggCounts:Record<string,number>={};
  for(const a of as){
    const d=day(a.checkinDate), o=String(a.aggregator??"unknown");
    aggCounts[o]=(aggCounts[o]??0)+1;
    if(a.idMember!=null&&d){const k=`${a.idMember}|${d}`;const arr=aggMember.get(k)??[];arr.push(o);aggMember.set(k,arr);}
    const n=name(a.name); if(n&&d){const k=`${n}|${d}`;const arr=aggName.get(k)??[];arr.push(o);aggName.set(k,arr);}
  }

  const result={wellhub:0,totalpass:0,classpass:0,otherAggregator:0,koraSale:0,koraReplacement:0,participantNoSale:0,noParticipantMatch:0};
  for(const e of [...es].sort((a,b)=>String(a.date??a.dateTurn??"").localeCompare(String(b.date??b.dateTurn??"")))){
    const d=day(e.date??e.dateTurn), mk=e.idMember!=null&&d?`${e.idMember}|${d}`:"", nk=name(e.nameMember??e.nameProspect)&&d?`${name(e.nameMember??e.nameProspect)}|${d}`:"";
    let o:string|undefined;
    if(mk){const a=aggMember.get(mk);if(a?.length)o=a.shift();}
    if(!o&&nk){const a=aggName.get(nk);if(a?.length)o=a.shift();}
    if(o){
      const n=o.toLowerCase();
      if(n.includes("wellhub")||n.includes("gympass"))result.wellhub++;
      else if(n.includes("totalpass"))result.totalpass++;
      else if(n.includes("classpass"))result.classpass++;
      else result.otherAggregator++;
      continue;
    }
    let cls:"sale"|"replacement"|"no-sale"|undefined;
    if(mk){const a=pp.member.get(mk);if(a?.length)cls=a.shift();}
    if(!cls&&nk){const a=pp.names.get(nk);if(a?.length)cls=a.shift();}
    if(cls==="sale")result.koraSale++;
    else if(cls==="replacement")result.koraReplacement++;
    else if(cls==="no-sale")result.participantNoSale++;
    else result.noParticipantMatch++;
  }
  return {period:{start,end},entries:es.length,aggregatorRecords:as.length,aggregators:aggCounts,participantStats:pp.stats,classified:result,classifiedTotal:Object.values(result).reduce((a,b)=>a+b,0)};
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-audit-20260918-7f1c9d")return NextResponse.json({error:"not found"},{status:404});
  try{
    const [aug,sep]=await Promise.all([audit("2026-08-01","2026-08-31"),audit("2026-09-01","2026-09-30")]);
    return NextResponse.json({aug,sep});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500});}
}
