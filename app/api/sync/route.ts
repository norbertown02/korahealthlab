import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync-service";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return syncResponse();
}

export async function POST() {
  return syncResponse();
}

async function syncResponse() {
  const payload = await runSync();
  return NextResponse.json({
    status: "ok",
    syncedAt: new Date().toISOString(),
    summary: payload.summaryCards
  });
}
