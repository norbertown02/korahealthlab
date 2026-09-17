import { NextRequest, NextResponse } from "next/server";
import { getDashboardFromSupabase } from "@/lib/supabase-dashboard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== "cpcheck-20260917-kora-8f41b2") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const data = await getDashboardFromSupabase({
      start: "2026-09-01",
      end: "2026-09-30",
      classType: "all"
    });
    const classpass = data.originEntries.find((item) =>
      item.label.toLocaleLowerCase("pt-BR").includes("classpass")
    );
    return NextResponse.json({
      period: { start: "2026-09-01", end: "2026-09-30" },
      summaryCards: data.summaryCards,
      originEntries: data.originEntries,
      classpass: classpass?.value ?? null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
