import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
const REF="ovquzagoddwgqixtmkbr";

function poolerUrl(original:string, host:string) {
  const url=new URL(original);
  url.hostname=host;
  url.port="5432";
  url.username=`postgres.${REF}`;
  return url.toString();
}

async function testRegion(region:string, original:string) {
  for (const prefix of ["aws-0","aws-1"]) {
    const host=`${prefix}-${region}.pooler.supabase.com`;
    const client=new Client({
      connectionString:poolerUrl(original,host),
      ssl:{rejectUnauthorized:false},
      connectionTimeoutMillis:2500,
      query_timeout:4000
    });
    try {
      await client.connect();
      const q=await client.query(`
        select current_database() db,
               (select count(*) from information_schema.tables where table_name='fact_entries') fact_entries_tables
      `);
      return {region,prefix,ok:true,check:q.rows[0]};
    } catch(e) {
      const msg=e instanceof Error?e.message:String(e);
      if (!/tenant\/user .* not found|ENOTFOUND|timeout|ETIMEDOUT/i.test(msg)) {
        return {region,prefix,ok:false,error:msg};
      }
    } finally {
      try{await client.end();}catch{}
    }
  }
  return {region,ok:false,error:"tenant-not-found"};
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="origin-july-names-20260918-a92c") return NextResponse.json({error:"not found"},{status:404});
  const original=process.env.POSTGRES_URL;
  if(!original) return NextResponse.json({error:"missing POSTGRES_URL"},{status:500});
  const regions=[
    "us-east-1","us-east-2","us-west-1","us-west-2",
    "ca-central-1","sa-east-1",
    "eu-west-1","eu-west-2","eu-west-3","eu-central-1","eu-north-1",
    "ap-south-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2"
  ];
  const results=await Promise.all(regions.map(region=>testRegion(region,original)));
  return NextResponse.json({results});
}
