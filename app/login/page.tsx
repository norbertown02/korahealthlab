import { KoraLogo } from "@/components/kora-logo";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] : item;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = value(params, "next") ?? "/";

  return (
    <main className="kora-auth-shell">
      <section className="kora-auth-panel">
        <div className="kora-auth-brand">
          <div className="kora-auth-logo-wrap"><KoraLogo className="kora-auth-logo" /></div>
          <p>Kora Health Lab</p>
        </div>
        <div className="kora-auth-copy">
          <span>Private Studio Intelligence</span>
          <h1>Sua operação,<br /><i>em uma visão.</i></h1>
          <p>Acesse o painel de gestão do Kora para acompanhar movimento, receita, professoras e recorrência.</p>
        </div>
        <LoginForm nextPath={nextPath} />
        <small className="kora-auth-foot">Acesso privado · Kora Health Lab</small>
      </section>
      <aside className="kora-auth-art" aria-hidden="true">
        <div className="kora-auth-orbit orbit-one" />
        <div className="kora-auth-orbit orbit-two" />
        <div className="kora-auth-orbit orbit-three" />
        <span>MOVIMENTO<br />COM INTENÇÃO</span>
      </aside>
    </main>
  );
}
