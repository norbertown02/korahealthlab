import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

function keysOf(row: unknown) {
  return row && typeof row === "object" ? Object.keys(row as Record<string, unknown>) : [];
}
function sampleShape(rows: unknown[]) {
  return rows.slice(0,3).map((row) => {
    const obj = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (/name|email|phone|cpf/i.test(key)) continue;
      if (key === "raw_payload") {
        out.raw_payload_keys = keysOf(value);
        continue;
      }
      if (typeof value === "string" && value.length > 100) out[key] = value.slice(0,100);
      else out[key] = value;
    }
    return out;
  });
}

async function readTable(table: string, select = "*") {
  const supabase = getSupabaseAdmin();
  const { data, error, count } = await supabase
    .from(table)
    .select(select, { count: "exact" })
    .limit(5);
  return {
    table,
    ok: !error,
    error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
    count,
    keys: data?.[0] ? keysOf(data[0]) : [],
    sample: sampleShape(data ?? [])
  };
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== "validate-origin-sep-20260918-7d52a1") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const tables = ["fact_entries","fact_aggregator_checkins","fact_class_participants","fact_class_sessions","fact_sales"];
  const result = await Promise.all(tables.map((t) => readTable(t)));
  return NextResponse.json({ result });
}
