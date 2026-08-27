import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "kora_session";
const SESSION_MESSAGE = "kora-dashboard-session-v1";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sessionToken(password: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_MESSAGE)
  );
  return toBase64Url(new Uint8Array(signature));
}

function validBasicAuth(header: string | null, password: string) {
  if (!header?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    const providedPassword = separator >= 0 ? decoded.slice(separator + 1) : "";
    return providedPassword === password;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/health" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/manifest.webmanifest"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

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
    const hasLegacyAccess = password && validBasicAuth(request.headers.get("authorization"), password);
    if (bearer !== secret && !hasLegacyAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "APP_PASSWORD not configured" }, { status: 503 });
  }

  const expected = await sessionToken(password);
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Keep the browser/PWA on the exact URL it was opened with. Rendering the
  // login page through a rewrite avoids a client navigation from /login to /
  // that can cause iOS Home Screen web apps to fall back into Safari chrome.
  const loginUrl = request.nextUrl.clone();
  const originalPath = pathname + request.nextUrl.search;
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (originalPath !== "/") loginUrl.searchParams.set("next", originalPath);
  return NextResponse.rewrite(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\.).*)"]
};
