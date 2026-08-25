import type { ClientIntelligence } from "@/lib/types";

function format(value: number) { return value.toLocaleString("pt-BR"); }
function pct(value: number | null) { return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`; }
function monthLabel(value: string) {
  const [year, month] = value.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(month) - 1]}/${year.slice(2)}`;
}
function teacherName(value: string) {
  return value.toLocaleLowerCase("pt-BR").replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

export function TeacherRetentionPanel({ data }: { data?: ClientIntelligence | null }) {
  if (!data) return null;
  const rows = data.teacher_retention.rows
    .filter((row) => row.first_experiences >= 20)
    .sort((a, b) => b.first_experiences - a.first_experiences);

  return (
    <div className="retention-deep-dive">
      <div className="intelligence-heading">
        <div><p className="mini-title">Retenção por professora</p><h3>A primeira experiência gera retorno?</h3></div>
        <p>Compare retenção, não só ocupação. D+30 usa apenas alunos que já tiveram 30 dias completos para voltar.</p>
      </div>
      <div className="teacher-retention-table compact">
        <div className="teacher-retention-head"><span>Professora da 1ª aula</span><span>Primeiras</span><span>D+30</span><span>2ª visita</span><span>Volta à mesma prof.</span></div>
        {rows.map((row) => (
          <div className="teacher-retention-row" key={row.teacher}>
            <strong>{teacherName(row.teacher)}</strong>
            <span>{format(row.first_experiences)}</span>
            <span className="retention-focus"><b>{pct(row.d30_rate)}</b><small>amostra {row.d30_eligible}</small></span>
            <span><b>{pct(row.repeat2_rate)}</b><small>{row.repeat2} alunos</small></span>
            <span><b>{pct(row.same_teacher_rate)}</b><small>entre quem voltou</small></span>
          </div>
        ))}
      </div>
      <div className="data-caveat">{data.teacher_retention.note} Use D+30 como métrica principal de retenção da primeira experiência; “mesma prof.” mostra fidelidade à professora, não retenção geral do estúdio.</div>
    </div>
  );
}

export function ClientIntelligencePanel({ data }: { data?: ClientIntelligence | null }) {
  if (!data) return null;
  const base = Math.max(1, data.overall.funnel[0]?.clients ?? 1);
  const latestMonth = data.acquisition_monthly.at(-1);

  return (
    <>
      <article className="report-card card-full client-journey-card">
        <div className="section-title journey-title"><div><p className="kicker">Saúde da base</p><h2>Quem entra, quem volta e quem estamos perdendo</h2></div><p>Histórico consolidado até {data.period_end.split("-").reverse().join("/")}.</p></div>
        <div className="journey-kpis compact">
          <div><span>Alunos que vieram</span><strong>{format(data.overall.unique_visitors)}</strong><small>pessoas identificadas com 1+ visita</small></div>
          <div><span>Recorrência</span><strong>{pct(data.overall.repeat_rate)}</strong><small>{format(data.overall.repeaters)} chegaram à 2ª visita</small></div>
          <div><span>Ativos</span><strong>{format(data.overall.active_clients)}</strong><small>2+ visitas e presença em até 30 dias</small></div>
          <div><span>Em risco</span><strong>{format(data.overall.risk_clients)}</strong><small>15–30 dias sem voltar</small></div>
          <div><span>Perdidos</span><strong>{format(data.overall.lost_clients)}</strong><small>mais de 30 dias sem voltar</small></div>
        </div>

        <div className="journey-funnel-shell">
          <div className="journey-funnel-heading">
            <div><p className="mini-title">Jornada real</p><h3>Da primeira aula ao hábito</h3></div>
            <p>O tamanho da barra mostra quanto da base chegou à etapa. À direita, mostramos a conversão em relação à etapa anterior.</p>
          </div>
          <div className="journey-funnel executive">
            {data.overall.funnel.map((stage, index) => {
              const width = Math.max(9, stage.clients / base * 100);
              const shareOfBase = stage.clients / base * 100;
              const previous = index === 0 ? stage.clients : data.overall.funnel[index - 1].clients;
              const conversion = previous ? stage.clients / previous * 100 : 0;
              const label = stage.visits === 1 ? "1ª visita" : `${stage.visits}+ visitas`;
              return (
                <div className="journey-stage executive-stage" key={stage.visits}>
                  <div className="journey-track">
                    <div className="journey-stage-bar" style={{ width: `${width}%` }}>
                      <div><span>{label}</span><small>{shareOfBase.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da base</small></div>
                      <strong>{format(stage.clients)}</strong>
                    </div>
                  </div>
                  <div className={`journey-conversion ${index === 0 ? "base" : ""}`}>
                    <b>{index === 0 ? "100%" : `${conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</b>
                    <span>{index === 0 ? "base de alunos que efetivamente vieram" : `avançam de ${data.overall.funnel[index - 1].visits === 1 ? "1ª visita" : `${data.overall.funnel[index - 1].visits}+ visitas`} para ${label}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      <article className="report-card card-full acquisition-quality-card">
        <div className="section-title"><div><p className="kicker">Aquisição</p><h2>Volume é bom. Retorno é melhor.</h2></div><p>Uma visão única para responder quem traz novos alunos e qual canal traz alunos que voltam.</p></div>
        <div className="acquisition-quality-grid">
          <div>
            <p className="mini-title">Novos alunos por mês</p>
            <div className="acquisition-months compact">
              {data.acquisition_monthly.map((month) => (
                <div className="acquisition-month" key={month.month}>
                  <div className="acquisition-month-title"><strong>{monthLabel(month.month)}</strong><span>{format(month.new)} novos</span></div>
                  <div className="acquisition-stack"><i className="wellhub" style={{ width: `${month.wellhub / Math.max(1, month.new) * 100}%` }} /><i className="totalpass" style={{ width: `${month.totalpass / Math.max(1, month.new) * 100}%` }} /><i className="direct" style={{ width: `${month.direct / Math.max(1, month.new) * 100}%` }} /></div>
                  <small>Wellhub {month.wellhub} · TotalPass {month.totalpass} · Direto {month.direct}</small>
                  <b>{month.d30_rate === null ? "D+30 em maturação" : `D+30 ${pct(month.d30_rate)} · n=${month.d30_n}`}</b>
                </div>
              ))}
            </div>
            {latestMonth ? <div className="intelligence-callout"><strong>{format(latestMonth.new)} primeiras visitas em {monthLabel(latestMonth.month)}</strong><span>{format(latestMonth.wellhub + latestMonth.totalpass)} vieram de agregadores.</span></div> : null}
          </div>

          <div>
            <p className="mini-title">Qualidade por canal</p>
            <div className="channel-retention-table compact">
              <div className="channel-retention-head"><span>Origem</span><span>Primeiras</span><span>D+30</span><span>2ª visita</span><span>5+ visitas</span></div>
              {data.origin_retention.map((row) => <div className="channel-retention-row" key={row.origin}><strong>{row.origin}</strong><span>{format(row.new)}</span><span className="retention-focus"><b>{pct(row.d30_rate)}</b><small>n={row.d30_eligible}</small></span><span><b>{pct(row.repeat2_rate)}</b><small>{row.repeat2} alunos</small></span><span><b>{format(row.repeat5)}</b><small>alunos</small></span></div>)}
            </div>
            <div className="data-caveat">D+30 é a régua principal para comparar canais. “2ª visita” mostra recorrência acumulada; “5+” mostra formação de hábito.</div>
          </div>
        </div>
      </article>
    </>
  );
}