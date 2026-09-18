import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

function classifyEnv() {
  const rows: Array<{name:string;kind:string;host?:string}> = [];
  for (const [name,value] of Object.entries(process.env)) {
    if (!value || !/(DATABASE|POSTGRES|PG|SUPABASE)/i.test(name)) continue;
    let kind="other", host: string|undefined;
    if (/^postgres(?:ql)?:\/\//i.test(value)) {
      kind="postgres-url";
      try { host=new URL(value).host; } catch {}
    } else if (/^https?:\/\//i.test(value)) {
      kind="http-url";
      try { host=new URL(value).host; } catch {}
    } else if (/KEY|SECRET|TOKEN|PASSWORD/i.test(name)) {
      kind="secret";
    }
    rows.push({name,kind,host});
  }
  return rows;
}

async function testPostgres(name:string,value:string) {
  const client=new Client({connectionString:value,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:5000});
  try {
    await client.connect();
    const tables=await client.query(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema not in ('pg_catalog','information_schema')
        and table_name in ('fact_entries','fact_aggregator_checkins','fact_class_participants','fact_sales','kora_people')
      order by table_schema, table_name
    `);
    return {name,ok:true,tables:tables.rows};
  } catch(e) {
    return {name,ok:false,error:e instanceof Error?e.message:String(e)};
  } finally {
    try{await client.end();}catch{}
  }
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-july-names-20260918-a92c") return NextResponse.json({error:"not found"},{status:404});
  const envs=classifyEnv();
  const tests=[];
  for(const row of envs){
    if(row.kind!=="postgres-url") continue;
    const value=process.env[row.name];
    if(value) tests.push(await testPostgres(row.name,value));
  }
  return NextResponse.json({envs,tests});
}
