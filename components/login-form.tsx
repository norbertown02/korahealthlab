"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
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

      // Login, loading and dashboard now share the same physical route.
      // Refresh only the server component tree so the iOS Home Screen app
      // never performs a document navigation that can escape to Safari.
      router.refresh();
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
