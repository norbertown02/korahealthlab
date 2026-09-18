import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
const REF="ovquzagoddwgqixtmkbr";

async function testConnection(label:string, connectionString:string) {
  const client=new Client({
    connectionString,
    ssl:{rejectUnauthorized:false},
    connectionTimeoutMillis:4000,
    query_timeout:5000
  });
  try {
    await client.connect();
    const result=await client.query(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema not in ('pg_catalog','information_schema')
        and table_name in ('fact_entries','fact_aggregator_checkins','fact_class_participants','fact_sales','kora_people')
      order by table_schema, table_name
    `);
    return {label,ok:true,tables:result.rows};
  } catch(e) {
    return {label,ok:false,error:e instanceof Error?e.message:String(e)};
  } finally {
    try{await client.end();}catch{}
  }
}

function poolerUrl(original:string, host:string, port:string) {
  const url=new URL(original);
  url.hostname=host;
  url.port=port;
  url.username=`postgres.${REF}`;
  return url.toString();
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-july-names-20260918-a92c") return NextResponse.json({error:"not found"},{status:404});
  const original=process.env.POSTGRES_URL;
  if(!original) return NextResponse.json({error:"missing POSTGRES_URL"},{status:500});
  const candidates=[
    ["aws0-sa-session","aws-0-sa-east-1.pooler.supabase.com","5432"],
    ["aws0-sa-transaction","aws-0-sa-east-1.pooler.supabase.com","6543"],
    ["aws1-sa-session","aws-1-sa-east-1.pooler.supabase.com","5432"],
    ["aws1-sa-transaction","aws-1-sa-east-1.pooler.supabase.com","6543"]
  ] as const;
  const results=[];
  for(const [label,host,port] of candidates){
    results.push(await testConnection(label,poolerUrl(original,host,port)));
    if(results.at(-1)?.ok) break;
  }
  return NextResponse.json({results});
}
