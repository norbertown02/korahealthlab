import { KoraLogo } from "@/components/kora-logo";

export default function Loading() {
  return (
    <main className="kora-loading-shell" role="status" aria-live="polite">
      <div className="kora-loading-card">
        <div className="kora-loading-logo-wrap"><KoraLogo className="kora-loading-logo" /></div>
        <span>Private Studio Intelligence</span>
        <h1>Preparando sua visão<br /><i>de gestão.</i></h1>
        <p>Consolidando acessos, vendas, aulas e inteligência de clientes.</p>
        <div className="kora-loading-track" aria-hidden="true"><i /></div>
        <small>Carregando dados do Kora</small>
      </div>
    </main>
  );
}
