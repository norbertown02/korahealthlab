import { KoraLogo } from "@/components/kora-logo";
import type { DashboardFilters, DashboardPayload } from "@/lib/types";

const classOptions = [
  { value: "all", label: "Todas as modalidades" },
  { value: "hot-sculpt", label: "Hot Sculpt" },
  { value: "yoga", label: "Yoga" }
] as const;

function format(value: number) {
  return value.toLocaleString("pt-BR");
}

export function DashboardShell({ data, filters }: { data: DashboardPayload; filters: DashboardFilters }) {
  const studio = data.studio;
  const customers = data.customers;
  const maxOrigin = Math.max(1, ...data.originEntries.map((item) => item.value));
  const maxTime = Math.max(1, ...(studio?.timeWindows.map((item) => item.occupancy) ?? [1]));
  const maxTeacher = Math.max(1, ...(studio?.teachers.map((item) => item.occupancy) ?? [1]));
  const currentClass = filters.classType ?? "all";
  const start = data.filters?.start ?? filters.start ?? "";
  const end = data.filters?.end ?? filters.end ?? "";
  const weekly = data.weeklyTrend ?? [];
  const weeklyValues = weekly.flatMap((item) => item.entries === null ? [] : [item.entries]);
  const weeklyMax = Math.max(1, ...weeklyValues);

  return (
    <main className="kora-report">
      <header className="topbar">
        <div className="brand-lockup"><KoraLogo className="brand-logo" /><span>PRIVATE STUDIO REPORT</span></div>
        <div className="topbar-meta"><span className="live-dot" />Histórico salvo e auditável</div>
      </header>

      <section className="hero-kora">
        <div className="hero-copy-kora">
          <p className="kicker">Kora Health Lab / visão de gestão</p>
          <h1>O corpo da operação,<br /><i>visto com calma.</i></h1>
          <p className="hero-description">Leia demanda, capacidade e recorrência para decidir onde expandir, ajustar ou proteger a experiência do estúdio.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span className="orbit-label">MOVIMENTO<br />COM INTENÇÃO</span><span className="orbit-ring ring-a" /><span className="orbit-ring ring-b" /></div>
        <div className="hero-stat"><span>recorte atual</span><strong>{data.periodLabel}</strong><small>{data.heroMix}</small></div>
      </section>

      <form className="filter-deck" action="/" method="get">
        <div className="filter-title"><span>Recorte</span><strong>Escolha o que quer entender</strong></div>
        <label><span>De</span><input name="start" type="date" defaultValue={start} /></label>
        <label><span>Até</span><input name="end" type="date" defaultValue={end} /></label>
        <label className="filter-wide"><span>Modalidade</span><select name="classType" defaultValue={currentClass}>{classOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
        <button type="submit">Atualizar visão</button>
      </form>

      <section className="signal-row">
        <div className="signal-intro"><p className="kicker">Sinais do período</p><h2>O que merece atenção agora.</h2></div>
        <div className="signal-cards">
          {(data.actions.length ? data.actions : [{ tag: "base", title: "Histórico em construção", detail: "Os sinais de decisão aparecem conforme as aulas são sincronizadas." }]).map((item) => (
            <article className="signal-card" key={item.title}><span className={`signal-tag ${item.tag}`}>{item.tag}</span><h3>{item.title}</h3><p>{item.detail}</p></article>
          ))}
        </div>
      </section>

      <section className="metric-ribbon">
        {data.summaryCards.slice(0, 7).map((item, index) => <article className={`ribbon-card ribbon-${index}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></article>)}
      </section>

      <section className="report-grid">
        <article className="report-card card-wide card-dark">
          <div className="section-title light-title"><div><p className="kicker">Modalidades</p><h2>Ocupação por prática</h2></div><p>Capacidade ocupada, não apenas entradas no estúdio.</p></div>
          <div className="modality-grid">{(studio?.modalities ?? []).map((modality) => <div className="modality-card" key={modality.key}><div className="modality-top"><span>{modality.name}</span><b>{modality.occupancy}%</b></div><div className="occupancy-track"><span style={{ width: `${modality.occupancy}%` }} /></div><div className="modality-bottom"><span>{format(modality.sessions)} aulas</span><span>{format(modality.occupied)} / {format(modality.capacity)} vagas</span></div></div>)}</div>
          <div className="modality-note">Hot Yoga é lido dentro de Yoga para que a decisão de grade compare famílias de prática, sem diluir a operação.</div>
        </article>

        <article className="report-card card-tall">
          <div className="section-title"><div><p className="kicker">Capacidade</p><h2>Quando a casa enche</h2></div><p>Ocupação por horário de início.</p></div>
          <div className="time-ladder">{(studio?.timeWindows ?? []).map((window) => <div className="time-row" key={window.label}><span>{window.label}</span><div className="time-bar"><i style={{ width: `${(window.occupancy / maxTime) * 100}%` }} /></div><b>{window.occupancy}%</b><small>{window.sessions} aulas</small></div>)}</div>
        </article>

        <article className="report-card card-half">
          <div className="section-title"><div><p className="kicker">Canais</p><h2>De onde vem a presença</h2></div><p>Uma entrada, uma origem.</p></div>
          <div className="origin-list">{data.originEntries.map((item) => <div className="origin-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.value / maxOrigin) * 100}%`, backgroundColor: item.tone }} /></div><b>{format(item.value)}</b></div>)}</div>
          <small className="footnote">Agregadores classificam o acesso existente; não são somados ao total novamente.</small>
        </article>

        <article className="report-card card-half">
          <div className="section-title"><div><p className="kicker">Ritmo semanal</p><h2>Onde a semana responde</h2></div><p>Total no recorte e média por ocorrência de cada dia.</p></div>
          <div className="weekday-strip">{data.weekday.map((day) => {
            const height = Math.max(14, day.entries / Math.max(1, ...data.weekday.map((item) => item.entries)) * 112);
            return <div className="weekday-col" key={day.day}><div className="weekday-bar" style={{ height }}><span>{day.entries}</span></div><b>{day.day}</b><small className="weekday-average">média {day.averageEntries ?? 0}</small><small>{day.aggregatorShare}% parceiros</small></div>;
          })}</div>
        </article>

        <article className="report-card card-full weekly-trend-card">
          <div className="section-title"><div><p className="kicker">Evolução de acessos</p><h2>Acessos totais por semana</h2></div><p>Janela de até 6 meses. Semanas de meses ainda não carregados aparecem como lacunas.</p></div>
          <div className="weekly-trend">
            {weekly.map((item, index) => <div className={`weekly-point ${item.entries === null ? "missing" : ""}`} key={item.week} title={item.entries === null ? `${item.label}: histórico pendente` : `${item.label}: ${item.entries} acessos`}>
              <div className="weekly-bar-wrap"><i style={{ height: item.entries === null ? "0%" : `${Math.max(3, (item.entries / weeklyMax) * 100)}%` }} /></div>
              {(index % 2 === 0 || index === weekly.length - 1) ? <span>{item.label}</span> : <span className="ghost-label">·</span>}
            </div>)}
          </div>
          <div className="weekly-legend"><span><i />Semana com histórico</span><span><i className="missing-key" />Histórico pendente</span></div>
        </article>

        <article className="report-card card-full">
          <div className="section-title"><div><p className="kicker">Professoras</p><h2>Quem sustenta a experiência</h2></div><p>Ranking por ocupação, com volume suficiente para leitura.</p></div>
          <div className="teacher-table"><div className="teacher-head"><span>Professora</span><span>Aulas</span><span>Ocupação</span><span>Vagas ocupadas</span></div>{(studio?.teachers ?? []).slice(0, 8).map((teacher, index) => <div className="teacher-line" key={teacher.name}><span><em>{String(index + 1).padStart(2, "0")}</em>{teacher.name}</span><span>{teacher.classes}</span><span className="teacher-progress"><i style={{ width: `${(teacher.occupancy / maxTeacher) * 100}%` }} />{teacher.occupancy}%</span><span>{teacher.occupied} / {teacher.capacity}</span></div>)}</div>
        </article>

        <article className="report-card card-half">
          <div className="section-title"><div><p className="kicker">Comportamento</p><h2>Base e retorno</h2></div><p>Leitura que amadurece junto do histórico.</p></div>
          <div className="behavior-stack">{data.customerGroups.map((group) => <div className="behavior-item" key={group.title}><span>{group.title}</span><strong>{typeof group.value === "number" ? format(group.value) : group.value}</strong><small>{group.note}</small></div>)}</div>
        </article>

        <article className="report-card card-full client-intelligence">
          <div className="section-title"><div><p className="kicker">Base de clientes</p><h2>Frequência, ativação e valor de recorrência</h2></div><p>{customers?.note ?? "A análise de clientes será exibida assim que o histórico estiver disponível."}</p></div>
          <div className="client-kpis"><div><span>Base observada</span><strong>{customers ? format(customers.totalClients) : "—"}</strong><small>pessoas identificadas no histórico</small></div><div><span>Ativos no recorte</span><strong>{customers ? format(customers.activeClients) : "—"}</strong><small>ao menos um dia de acesso</small></div><div><span>Repetiram no período</span><strong>{customers ? `${customers.repeatRate}%` : "—"}</strong><small>2 ou mais dias de acesso</small></div><div><span>Consistência semanal</span><strong>{customers ? `${customers.consistencyRate}%` : "—"}</strong><small>frequentaram em 2+ semanas</small></div><div><span>Frequência média</span><strong>{customers ? customers.averageFrequency : "—"}</strong><small>dias ativos por cliente</small></div><div><span>2ª visita em</span><strong>{customers?.medianDaysToSecondVisit === null || !customers ? "—" : `${customers.medianDaysToSecondVisit} dias`}</strong><small>mediana entre quem voltou</small></div></div>
          {customers?.quality === "partial" ? <div className="data-caveat">Histórico em completamento: meses pendentes ({customers.missingMonths.join(", ")}). Os sinais dentro do recorte são reais; não classificamos clientes como novos, recuperados ou perdidos antes da série contínua.</div> : null}
          <div className="client-journey"><div><span>Primeiras visitas observadas</span><strong>{customers ? format(customers.observedFirstVisits) : "—"}</strong><small>primeiro acesso dentro deste recorte</small></div><div><span>Ativação em 7 dias</span><strong>{customers?.activation7 === null || !customers ? "—" : `${customers.activation7}%`}</strong><small>voltaram após a primeira visita</small></div><div><span>Ativação em 30 dias</span><strong>{customers?.activation30 === null || !customers ? "—" : `${customers.activation30}%`}</strong><small>continuidade inicial da jornada</small></div><div><span>Alta frequência</span><strong>{customers ? format(customers.frequentClients) : "—"}</strong><small>4 ou mais dias no recorte</small></div><div><span>Ativos na última semana</span><strong>{customers ? format(customers.recentActiveClients) : "—"}</strong><small>presença nos últimos 7 dias disponíveis</small></div></div>
          <div className="client-bottom"><div><p className="mini-title">Distribuição de frequência</p><div className="frequency-bands">{(customers?.frequencyBands ?? []).map((band) => <div className={`frequency-band ${band.tone}`} key={band.label}><strong>{format(band.clients)}</strong><span>{band.label}</span></div>)}</div></div><div><p className="mini-title">Clientes mais frequentes no recorte</p><div className="client-ranking">{(customers?.ranking ?? []).slice(0, 5).map((client, index) => <div key={client.name}><em>{String(index + 1).padStart(2, "0")}</em><span>{client.name}</span><b>{client.visits} dias</b><small>{client.totalVisits} no histórico</small></div>)}</div></div></div>
        </article>

        <article className="report-card card-full">
          <div className="section-title"><div><p className="kicker">Histórico</p><h2>Entradas x vendas</h2></div><p>Não compare uma entrada com uma venda: são sinais distintos.</p></div>
          <div className="month-compare">{data.monthly.map((month) => { const max = Math.max(1, ...data.monthly.map((item) => item.entries)); return <div className="month-block" key={month.month}><div className="month-stacks"><i className="entry" style={{ height: `${(month.entries / max) * 116}px` }} /><i className="sales" style={{ height: `${Math.max(12, month.sales / max * 116)}px` }} /></div><b>{month.month}</b><small>{month.entries} acessos / {month.sales} vendas</small></div>; })}</div>
        </article>
      </section>

      <footer className="report-footer"><div><KoraLogo className="footer-logo" /></div><p>Dados operacionais armazenados no Supabase. A EVO é consultada somente pela sincronização interna.</p><span>ÚLTIMA VISÃO: {data.periodLabel}</span></footer>
    </main>
  );
}
