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

export async function POST(request: Request) {
  const configured = process.env.APP_PASSWORD;
  if (!configured) {
    return NextResponse.json({ error: "Acesso não configurado." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!body.password || body.password !== configured) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await sessionToken(configured),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
