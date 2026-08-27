"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Não foi possível entrar.");
        setLoading(false);
        return;
      }

      const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";

      // When middleware renders the login UI over the original protected URL,
      // keep the iOS Home Screen web app in the same navigation context.
      // A Next.js router refresh re-requests the current server components and
      // lets middleware see the new auth cookie without performing a browser
      // reload, which can make iOS fall back to Safari chrome.
      if (window.location.pathname !== "/login") {
        router.refresh();
        return;
      }

      // Direct browser visits to /login still need to enter the requested route.
      router.replace(safeNext);
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form className="kora-login-form" onSubmit={submit}>
      <label>
        <span>Senha de acesso</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus
          required
          placeholder="Digite sua senha"
        />
      </label>
      {error ? <p className="kora-login-error" role="alert">{error}</p> : null}
      <button type="submit" disabled={loading}>
        <span>{loading ? "Entrando" : "Entrar no painel"}</span>
        <i aria-hidden="true">→</i>
      </button>
      {loading ? <div className="kora-login-progress"><i /></div> : null}
    </form>
  );
}
