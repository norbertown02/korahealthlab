"use client";

import { FormEvent, useState } from "react";

export function LoginForm({ nextPath = "/" }: { nextPath?: string }) {
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
        return;
      }

      const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";

      // When the login was rendered through middleware rewrite, the visible URL
      // is already the dashboard URL. Reloading the same standalone window lets
      // middleware see the new session cookie without opening a new navigation
      // context on iOS. Direct visits to /login still return to the requested
      // internal path using same-origin location replacement.
      if (window.location.pathname === "/login") {
        window.location.replace(safeNext);
      } else {
        window.location.reload();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
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
