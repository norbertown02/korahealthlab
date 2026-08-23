import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorized(realm: string) {
  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`
    }
  });
}

function validBasicAuth(header: string | null, password: string) {
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  if (pathname === "/api/sync") {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      const password = process.env.APP_PASSWORD;
      if (password && validBasicAuth(request.headers.get("authorization"), password)) {
        return NextResponse.next();
      }

      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const password = process.env.APP_PASSWORD;
    const hasAppAccess = password && validBasicAuth(request.headers.get("authorization"), password);
    if (bearer !== secret && !hasAppAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "APP_PASSWORD not configured" }, { status: 503 });
  }

  if (!validBasicAuth(request.headers.get("authorization"), password)) {
    return unauthorized("Kora Health Lab BI");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"]
};
