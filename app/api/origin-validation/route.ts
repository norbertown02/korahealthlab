import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function candidateNames() {
  const entries = Object.entries(process.env);
  const urls = entries
    .filter(([k,v]) => /SUPABASE/i.test(k) && /URL/i.test(k) && typeof v === "string" && /^https?:\/\//.test(v))
    .map(([k,v]) => ({ name:k, value:v as string, host:(()=>{try{return new URL(v as string).host}catch{return "invalid"}})() }));
  const keys = entries
    .filter(([k,v]) => /SUPABASE/i.test(k) && /(KEY|TOKEN|SECRET|SERVICE)/i.test(k) && typeof v === "string" && (v as string).length > 10)
    .map(([k,v]) => ({ name:k, value:v as string, kind:(v as string).startsWith("sb_secret_")?"sb_secret":(v as string).startsWith("eyJ")?"jwt":"other", length:(v as string).length }));
  return { urls, keys };
}

async function testPair(url:string,key:string) {
  try {
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const { error, count } = await client.from("fact_entries").select("id",{count:"exact",head:true});
    return { ok:!error, count:count??null, error:error?{message:error.message,code:error.code,hint:error.hint}:null };
  } catch (e) {
    return { ok:false, count:null, error:{message:e instanceof Error?e.message:String(e)} };
  }
}

export async function GET(req:NextRequest){
  if(req.nextUrl.searchParams.get("key")!=="validate-origin-sep-20260918-7d52a1") return NextResponse.json({error:"not found"},{status:404});
  const {urls,keys}=candidateNames();
  const tests=[];
  for(const u of urls){
    for(const k of keys){
      tests.push({urlVar:u.name,urlHost:u.host,keyVar:k.name,keyKind:k.kind,keyLength:k.length,...await testPair(u.value,k.value)});
    }
  }
  return NextResponse.json({
    urlVars:urls.map(({name,host})=>({name,host})),
    keyVars:keys.map(({name,kind,length})=>({name,kind,length})),
    tests
  });
}
