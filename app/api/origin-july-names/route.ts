import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
const REF="ovquzagoddwgqixtmkbr";
const HOST="aws-0-us-east-2.pooler.supabase.com";

function makeUrl(original:string, username:string, port:string) {
  const url=new URL(original);
  url.hostname=HOST;
  url.port=port;
  url.username=username;
  return url.toString();
}

async function test(label:string, connectionString:string) {
  const client=new Client({
    connectionString,
    ssl:{rejectUnauthorized:false},
    connectionTimeoutMillis:3500,
    query_timeout:5000
  });
  try{
    await client.connect();
    const q=await client.query(`
      select current_user, current_database(),
             (select count(*) from information_schema.tables where table_name='fact_entries') as fact_entries_tables
    `);
    return {label,ok:true,check:q.rows[0]};
  }catch(e){
    return {label,ok:false,error:e instanceof Error?e.message:String(e)};
  }finally{
    try{await client.end();}catch{}
  }
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-july-names-20260918-a92c") return NextResponse.json({error:"not found"},{status:404});
  const original=process.env.POSTGRES_URL;
  if(!original) return NextResponse.json({error:"missing POSTGRES_URL"},{status:500});
  const originalUser=new URL(original).username;
  const candidates=[
    ["session-ref",`postgres.${REF}`,"5432"],
    ["transaction-ref",`postgres.${REF}`,"6543"],
    ["session-original",originalUser,"5432"],
    ["transaction-original",originalUser,"6543"],
    ["session-ref-only",REF,"5432"],
    ["transaction-ref-only",REF,"6543"]
  ] as const;
  const results=[];
  for(const [label,user,port] of candidates){
    const result=await test(label,makeUrl(original,user,port));
    results.push(result);
    if(result.ok) break;
  }
  return NextResponse.json({results});
}
