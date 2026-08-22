import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync-service";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await runSync();
  return NextResponse.json({
    status: "ok",
    syncedAt: new Date().toISOString(),
    summary: payload.summaryCards
  });
}
