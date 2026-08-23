import type { DashboardPayload } from "@/lib/types";

function Dot({ color }: { color: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />;
}

export function DashboardShell({ data }: { data: DashboardPayload }) {
  const maxOrigin = Math.max(1, ...data.originEntries.map((item) => item.value));
  const maxEntries = Math.max(1, ...data.monthly.map((item) => item.entries));
  const maxSales = Math.max(1, ...data.monthly.map((item) => item.sales));

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-top">
          <div className="hero-copy">
            <div className="eyebrow">Kora Health Lab • BI online</div>
            <h1>Operação, vendas e histórico em uma única URL para celular e computador.</h1>
            <p>{data.description}</p>
          </div>
          <aside className="hero-side">
            <span className="chip">
              <Dot color="var(--heat)" />
              {data.periodLabel}
            </span>
            <strong>{data.summaryCards[0]?.value ?? "0"}</strong>
            <small>entradas no período</small>
            <small>{data.heroMix}</small>
          </aside>
        </div>
        <div className="hero-tags">
          <div className="tag">URL privada</div>
          <div className="tag">Sincronização automática</div>
          <div className="tag">Banco histórico</div>
          <div className="tag">Entradas, vendas e recorrência</div>
          <div className="tag">Pronto para professor e ocupação</div>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Painel executivo</div>
              <h2>Resumo do período</h2>
            </div>
            <p>{data.summaryNote}</p>
          </div>
          <div className="metric-grid">
            {data.summaryCards.map((item) => (
              <div className="metric-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half">
          <div className="section-head">
            <div>
              <div className="eyebrow">Mapa térmico</div>
              <h2>Acessos por dia da semana</h2>
            </div>
            <p>Leitura rápida dos dias mais fortes, com peso de parceiros em cada um.</p>
          </div>
          <div className="heat-grid">
            {data.weekday.map((item) => {
              const ratio = Math.max(0.22, item.entries / Math.max(1, Math.max(...data.weekday.map((day) => day.entries))));
              return (
                <div
                  className="heat-cell"
                  key={item.day}
                  style={{ background: `linear-gradient(180deg, rgba(237,108,68,${ratio}), rgba(255,255,255,0.9))` }}
                >
                  <div className="chip">{item.day}</div>
                  <strong style={{ display: "block", marginTop: 10, fontSize: 28 }}>{item.entries.toLocaleString("pt-BR")}</strong>
                  <small className="muted">
                    Clientes únicos: {item.uniqueClients.toLocaleString("pt-BR")}
                    <br />
                    Share parceiros: {item.aggregatorShare}%
                  </small>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel panel-half">
          <div className="section-head">
            <div>
              <div className="eyebrow">Canais</div>
              <h2>Entradas por origem</h2>
            </div>
            <p>Separação direta entre contratos/créditos e agregadores.</p>
          </div>
          <div className="bar-list">
            {data.originEntries.map((item) => (
              <div className="bar-row" key={item.label}>
                <div>{item.label}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(item.value / maxOrigin) * 100}%`, background: item.tone }} />
                </div>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Faixas</div>
              <h2>Volume e mix por horário</h2>
            </div>
            <p>Leitura útil para agenda, campanhas e conversão por janela operacional.</p>
          </div>
          <div className="stack-list">
            {data.slotMix.map((item) => (
              <div className="stack-row" key={item.slot}>
                <div>
                  <strong>{item.slot}</strong>
                  <br />
                  <small className="muted">
                    {item.entries.toLocaleString("pt-BR")} entradas • {item.uniqueClients.toLocaleString("pt-BR")} clientes
                  </small>
                </div>
                <div className="stack-track">
                  <div className="seg-contract" style={{ width: `${item.mix.contract}%` }} />
                  <div className="seg-wellhub" style={{ width: `${item.mix.wellhub}%` }} />
                  <div className="seg-totalpass" style={{ width: `${item.mix.totalpass}%` }} />
                  <div className="seg-classpass" style={{ width: `${item.mix.classpass}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half">
          <div className="section-head">
            <div>
              <div className="eyebrow">Tendência</div>
              <h2>Entradas x vendas</h2>
            </div>
            <p>Comparativo mensal pronto para crescer com o histórico no banco.</p>
          </div>
          <div className="timeline">
            {data.monthly.map((item) => (
              <div className="timeline-col" key={item.month}>
                <div className="timeline-bar sales" style={{ height: `${(item.sales / maxSales) * 84}px` }} />
                <div className="timeline-bar entries" style={{ height: `${(item.entries / maxEntries) * 130}px` }} />
                <div className="axis-label">{item.month}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half">
          <div className="section-head">
            <div>
              <div className="eyebrow">Clientes</div>
              <h2>Comportamento da base</h2>
            </div>
            <p>Retenção e retorno já preparados para leitura contínua no histórico.</p>
          </div>
          <div className="surface-grid">
            {data.customerGroups.map((item) => (
              <div className="surface-card" key={item.title} style={{ background: item.accent }}>
                <span className="chip">{item.title}</span>
                <strong>{item.value.toLocaleString("pt-BR")}</strong>
                <small className="muted">{item.note}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half">
          <div className="section-head">
            <div>
              <div className="eyebrow">Ações</div>
              <h2>Leituras acionáveis</h2>
            </div>
            <p>Camada pronta para empurrar decisões de grade, marketing e conversão.</p>
          </div>
          <div className="action-list">
            {data.actions.map((item) => (
              <div className="surface-card list-row" key={item.title}>
                <div>
                  <div className="chip">{item.tag}</div>
                  <strong style={{ display: "block", marginTop: 10 }}>{item.title}</strong>
                  <small className="muted">{item.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half">
          <div className="section-head">
            <div>
              <div className="eyebrow">Agenda real</div>
              <h2>Professoras e ocupação</h2>
            </div>
            <p>Calculado a partir de aulas, vagas e ocupação registrados na agenda da EVO.</p>
          </div>
          <div className="surface-grid">
            {data.teachers.length ? data.teachers.map((teacher) => (
              <div className="surface-card" key={teacher.name} style={{ background: "rgba(45, 141, 130, 0.12)" }}>
                <span className="chip">{teacher.occupancy}% ocupação</span>
                <strong>{teacher.name}</strong>
                <small className="muted">{teacher.classes} aulas no período</small>
              </div>
            )) : (
              <div className="empty-state">A agenda ainda não possui turmas suficientes para exibir professoras.</div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Infraestrutura</div>
              <h2>Como isso fica online e histórico</h2>
            </div>
            <p>{data.syncLabel}</p>
          </div>
          <div className="split">
            <div className="surface-card" style={{ flex: 1 }}>
              <strong>URL privada</strong>
              <p className="muted">Hospede em Vercel com domínio como `bi.korahealthlab.com.br` e proteção por senha ou autenticação.</p>
            </div>
            <div className="surface-card" style={{ flex: 1 }}>
              <strong>Banco histórico</strong>
              <p className="muted">Postgres guarda fatos de entradas, vendas, agregadores e snapshots do dashboard para comparativos mensais.</p>
            </div>
            <div className="surface-card" style={{ flex: 1 }}>
              <strong>Sincronização</strong>
              <p className="muted">O Supabase sincroniza a EVO internamente. O dashboard consulta somente o banco histórico.</p>
            </div>
          </div>
          <div className="secure-note">
            <strong>Segurança:</strong> o token da EVO fica somente no Supabase Vault e nunca chega à Vercel ou ao navegador. Nada sensível vai para o navegador.
          </div>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Fontes</div>
              <h2>Status das integrações</h2>
            </div>
            <p>Checklist para vocês saberem de onde cada parte do BI está vindo.</p>
          </div>
          <div className="source-table">
            {data.sources.map((item) => (
              <div className="source-row" key={`${item.name}-${item.endpoint}`}>
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted">{item.endpoint}</div>
                </div>
                <div className="muted" style={{ flex: 1 }}>
                  {item.usage}
                </div>
                <strong>{item.status}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
