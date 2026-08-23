"use client";

import { useState } from "react";

export function ManualSyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sync() {
    setState("syncing");
    setMessage("");

    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível sincronizar.");

      setState("done");
      setMessage("Dados reais importados. Atualizando o painel...");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível sincronizar.");
    }
  }

  return (
    <div className="manual-sync">
      <button type="button" onClick={sync} disabled={state === "syncing"}>
        {state === "syncing" ? "Sincronizando dados reais..." : "Sincronizar dados agora"}
      </button>
      {message ? <small className={state === "error" ? "sync-error" : "muted"}>{message}</small> : null}
    </div>
  );
}
