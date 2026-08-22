import { NextRequest, NextResponse } from "next/server";
import { getLatestDashboard } from "@/lib/repository";

function authorized(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    const providedPassword = separator >= 0 ? decoded.slice(separator + 1) : "";
    return providedPassword === password;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getLatestDashboard();
  return NextResponse.json(dashboard ?? { message: "Nenhum snapshot encontrado." });
}
