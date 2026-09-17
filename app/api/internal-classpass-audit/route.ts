import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

function key(value: unknown) {
  return String(value ?? "(vazio)").trim() || "(vazio)";
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== "cpcheck-20260917-kora-8f41b2") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [entriesRes, aggsRes] = await Promise.all([
      supabase
        .from("fact_entries")
        .select("id,id_member,entry_date,entry_type,device")
        .gte("entry_date", "2026-09-01")
        .lte("entry_date", "2026-09-30")
        .limit(10000),
      supabase
        .from("fact_aggregator_checkins")
        .select("id,id_member,aggregator_name,checkin_date,status")
        .gte("checkin_date", "2026-09-01")
        .lte("checkin_date", "2026-09-30")
        .limit(10000)
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (aggsRes.error) throw aggsRes.error;

    const entries = entriesRes.data ?? [];
    const aggs = aggsRes.data ?? [];

    const deviceCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    for (const row of entries) {
      deviceCounts[key(row.device)] = (deviceCounts[key(row.device)] ?? 0) + 1;
      typeCounts[key(row.entry_type)] = (typeCounts[key(row.entry_type)] ?? 0) + 1;
    }

    const aggCounts: Record<string, number> = {};
    for (const row of aggs) {
      aggCounts[key(row.aggregator_name)] = (aggCounts[key(row.aggregator_name)] ?? 0) + 1;
    }

    const totemByDevice = entries.filter((row) =>
      key(row.device).toLocaleLowerCase("pt-BR").includes("totem")
    ).length;
    const totemByType = entries.filter((row) =>
      key(row.entry_type).toLocaleLowerCase("pt-BR").includes("totem")
    ).length;

    const wellhub = Object.entries(aggCounts)
      .filter(([name]) => /wellhub|gympass/i.test(name))
      .reduce((sum, [, count]) => sum + count, 0);
    const totalpass = Object.entries(aggCounts)
      .filter(([name]) => /totalpass/i.test(name))
      .reduce((sum, [, count]) => sum + count, 0);

    return NextResponse.json({
      period: { start: "2026-09-01", end: "2026-09-30" },
      totalEntries: entries.length,
      aggregatorRows: aggs.length,
      deviceCounts,
      typeCounts,
      aggregatorCounts: aggCounts,
      totemByDevice,
      totemByType,
      wellhub,
      totalpass,
      residualUsingDeviceTotem: Math.max(0, entries.length - wellhub - totalpass - totemByDevice),
      residualUsingTypeTotem: Math.max(0, entries.length - wellhub - totalpass - totemByType)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
