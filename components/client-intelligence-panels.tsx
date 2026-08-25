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
        <div><p className="mini-title">Retenção por professora</p><h3>A primeira experiência influencia a volta?</h3></div>
        <p>D+30 considera apenas alunos que já tiveram 30 dias completos para retornar. A amostra aparece ao lado da taxa.</p>
      </div>
      <div className="teacher-retention-table">
        <div className="teacher-retention-head"><span>Professora da 1ª aula</span><span>Primeiras</span><span>D+7</span><span>D+14</span><span>D+30</span><span>2ª visita</span><span>Mesma prof.</span></div>
        {rows.map((row) => (
          <div className="teacher-retention-row" key={row.teacher}>
            <strong>{teacherName(row.teacher)}</strong>
            <span>{format(row.first_experiences)}</span>
            <span><b>{pct(row.d7_rate)}</b><small>n={row.d7_eligible}</small></span>
            <span><b>{pct(row.d14_rate)}</b><small>n={row.d14_eligible}</small></span>
            <span className="retention-focus"><b>{pct(row.d30_rate)}</b><small>n={row.d30_eligible}</small></span>
            <span><b>{pct(row.repeat2_rate)}</b><small>{row.repeat2} alunos</small></span>
            <span><b>{pct(row.same_teacher_rate)}</b><small>dos que voltaram</small></span>
          </div>
        ))}
      </div>
      <div className="data-caveat">{data.teacher_retention.note} “Mesma prof.” mede, entre quem voltou, quantos fizeram ao menos uma visita posterior com a professora da primeira experiência.</div>
    </div>
  );
}

export function ClientIntelligencePanel({ data }: { data?: ClientIntelligence | null }) {
  if (!data) return null;
  const base = Math.max(1, data.overall.funnel[0]?.clients ?? 1);
  const latestMonth = data.acquisition_monthly.at(-1);
  const matureMonths = data.acquisition_monthly.filter((item) => item.d30_rate !== null);

  return (
    <>
      <article className="report-card card-full client-journey-card">
        <div className="section-title"><div><p className="kicker">Jornada real</p><h2>Da primeira aula ao hábito</h2></div><p>Histórico consolidado de participantes até {data.period_end.split("-").reverse().join("/")}.</p></div>
        <div className="journey-kpis">
          <div><span>Alunos identificados</span><strong>{format(data.overall.unique_visitors)}</strong><small>vieram pelo menos uma vez</small></div>
          <div><span>Voltaram</span><strong>{format(data.overall.repeaters)}</strong><small>{pct(data.overall.repeat_rate)} fizeram 2+ visitas</small></div>
          <div><span>Ativos</span><strong>{format(data.overall.active_clients)}</strong><small>2+ visitas e presença em até 30 dias</small></div>
          <div><span>Em risco</span><strong>{format(data.overall.risk_clients)}</strong><small>recorrentes há 15–30 dias sem vir</small></div>
          <div><span>Perdidos</span><strong>{format(data.overall.lost_clients)}</strong><small>recorrentes há mais de 30 dias sem vir</small></div>
        </div>
        <div className="journey-funnel">
          {data.overall.funnel.map((stage, index) => {
            const width = Math.max(8, stage.clients / base * 100);
            const previous = index === 0 ? stage.clients : data.overall.funnel[index - 1].clients;
            const conversion = previous ? stage.clients / previous * 100 : 0;
            return <div className="journey-stage" key={stage.visits}><div className="journey-stage-bar" style={{ width: `${width}%` }}><span>{stage.visits === 1 ? "1ª visita" : `${stage.visits}+ visitas`}</span><strong>{format(stage.clients)}</strong></div><small>{index === 0 ? "base observada" : `${conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% avançam da etapa anterior`}</small></div>;
          })}
        </div>
      </article>

      <article className="report-card card-full acquisition-card">
        <div className="section-title"><div><p className="kicker">Aquisição</p><h2>Quem está trazendo gente nova</h2></div><p>Origem da primeira visita, não participação nas entradas totais.</p></div>
        <div className="acquisition-months">
          {data.acquisition_monthly.map((month) => (
            <div className="acquisition-month" key={month.month}>
              <div className="acquisition-month-title"><strong>{monthLabel(month.month)}</strong><span>{format(month.new)} novos</span></div>
              <div className="acquisition-stack"><i className="wellhub" style={{ width: `${month.wellhub / Math.max(1, month.new) * 100}%` }} /><i className="totalpass" style={{ width: `${month.totalpass / Math.max(1, month.new) * 100}%` }} /><i className="direct" style={{ width: `${month.direct / Math.max(1, month.new) * 100}%` }} /></div>
              <small>W {month.wellhub} · T {month.totalpass} · Direto {month.direct}</small>
              <b>{month.d30_rate === null ? "D+30 em maturação" : `D+30 ${pct(month.d30_rate)} (n=${month.d30_n})`}</b>
            </div>
          ))}
        </div>
        {latestMonth ? <div className="intelligence-callout"><strong>{format(latestMonth.new)} primeiras visitas em {monthLabel(latestMonth.month)}</strong><span>{format(latestMonth.wellhub + latestMonth.totalpass)} vieram de Wellhub + TotalPass.</span></div> : null}
      </article>

      <article className="report-card card-full channel-quality-card">
        <div className="section-title"><div><p className="kicker">Qualidade da aquisição</p><h2>Quem traz cliente que volta?</h2></div><p>Comparação madura por janela desde a primeira visita.</p></div>
        <div className="channel-retention-table">
          <div className="channel-retention-head"><span>Origem</span><span>Primeiras</span><span>D+7</span><span>D+14</span><span>D+30</span><span>2+ visitas</span><span>5+ visitas</span></div>
          {data.origin_retention.map((row) => <div className="channel-retention-row" key={row.origin}><strong>{row.origin}</strong><span>{format(row.new)}</span><span><b>{pct(row.d7_rate)}</b><small>n={row.d7_eligible}</small></span><span><b>{pct(row.d14_rate)}</b><small>n={row.d14_eligible}</small></span><span className="retention-focus"><b>{pct(row.d30_rate)}</b><small>n={row.d30_eligible}</small></span><span><b>{pct(row.repeat2_rate)}</b><small>{row.repeat2} alunos</small></span><span><b>{format(row.repeat5)}</b><small>alunos</small></span></div>)}
        </div>
        <div className="cohort-summary">{matureMonths.map((month) => <span key={month.month}><b>{monthLabel(month.month)}</b> D+30 {pct(month.d30_rate)}</span>)}</div>
      </article>
    </>
  );
}