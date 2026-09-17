import { NextResponse } from "next/server";
import { getDashboardFromSupabase } from "@/lib/supabase-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardFromSupabase({ classType: "all" });
    const classpass = data.originEntries.find((item) =>
      item.label.toLocaleLowerCase("pt-BR").includes("classpass")
    );
    return NextResponse.json({
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
