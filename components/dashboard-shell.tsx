import { KoraLogo } from "@/components/kora-logo";
import { ClientIntelligencePanel, TeacherRetentionPanel } from "@/components/client-intelligence-panels";
import { CommercialHistoryChart } from "@/components/commercial-history-chart";
import { PeriodFilter } from "@/components/period-filter";
import type { DashboardFilters, DashboardPayload } from "@/lib/types";

function format(value: number) { return value.toLocaleString("pt-BR"); }
function money(value: number) { return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function periodObservedEnd(periodLabel: string, fallback: string) {
  const match = periodLabel.match(/(\d{2})\/(\d{2})\/(\d{4})\s*$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : fallback;
}
function weekdayOccurrences(start: string, end: string, weekdayIndex: number) {
  if (!start || !end || end < start) return 0;
  let count = 0;
  const cursor = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (cursor <= stop) {
    if ((cursor.getUTCDay() + 6) % 7 === weekdayIndex) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export function DashboardShell({ data, filters }: { data: DashboardPayload; filters: DashboardFilters }) {
  const studio = data.studio;
  const customers = data.customers;
  const revenue = data.revenue;
  const funnel = data.retentionFunnel ?? [];
  const maxOrigin = Math.max(1, ...data.originEntries.map((item) => item.value));
  const maxTime = Math.max(1, ...(studio?.timeWindows.map((item) => item.occupancy) ?? [1]));
  const maxTeacher = Math.max(1, ...(studio?.teachers.map((item) => item.occupancy) ?? [1]));
  const start = data.filters?.start ?? filters.start ?? "";
  const end = data.filters?.end ?? filters.end ?? "";
  const observedEnd = periodObservedEnd(data.periodLabel, end);
  const weekly = data.weeklyTrend ?? [];
  const weeklyValues = weekly.flatMap((item) => item.entries === null ? [] : [item.entries]);
  const weeklyMax = Math.max(1, ...weeklyValues);
  const revenueMax = Math.max(1, ...(revenue?.weekly.map((item) => item.value) ?? [1]));
  const funnelBase = funnel[0]?.clients ?? 1;

  return (
    <main className="kora-report">
      <header className="topbar">
        <div className="brand-lockup"><KoraLogo className="brand-logo" /><span>PRIVATE STUDIO REPORT</span></div>
        <div className="topbar-meta"><span className="live-dot" />Histórico salvo e auditável</div>
      </header>

      <section className="hero-kora">
        <div className="hero-copy-kora"><p className="kicker">Kora Health Lab / visão de gestão</p><h1>O corpo da operação,<br /><i>visto com calma.</i></h1><p className="hero-description">Leia demanda, capacidade e recorrência para decidir onde expandir, ajustar ou proteger a experiência do estúdio.</p></div>
        <div className="hero-orbit" aria-hidden="true"><span className="orbit-label">MOVIMENTO<br />COM INTENÇÃO</span><span className="orbit-ring ring-a" /><span className="orbit-ring ring-b" /></div>
        <div className="hero-stat"><span>recorte atual</span><strong>{data.periodLabel}</strong><small>{data.heroMix}</small></div>
      </section>

      <PeriodFilter filters={filters} />

      <section className="signal-row">
        <div className="signal-intro"><p className="kicker">Sinais do período</p><h2>O que merece atenção agora.</h2></div>
        <div className="signal-cards">{(data.actions.length ? data.actions : [{ tag: "base", title: "Histórico em construção", detail: "Os sinais de decisão aparecem conforme as aulas são sincronizadas." }]).map((item) => <article className="signal-card" key={item.title}><span className={`signal-tag ${item.tag}`}>{item.tag}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <section className="metric-ribbon">{data.summaryCards.slice(0, 7).map((item, index) => <article className={`ribbon-card ribbon-${index}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></article>)}</section>

      <section className="report-grid">
        <article className="report-card card-full section-marker"><p className="kicker">01 / Acessos</p><h2>Demanda, presença e capacidade</h2></article>

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
          <div className="section-title"><div><p className="kicker">Ritmo semanal</p><h2>Onde a semana responde</h2></div><p>Total no recorte e média por ocorrência de cada dia já observado.</p></div>
          <div className="weekday-strip">{data.weekday.map((day, index) => { const height = Math.max(14, day.entries / Math.max(1, ...data.weekday.map((item) => item.entries)) * 112); const occurrences = weekdayOccurrences(start, observedEnd, index); const average = occurrences ? Math.round((day.entries / occurrences) * 10) / 10 : 0; return <div className="weekday-col" key={day.day}><div className="weekday-bar" style={{ height }}><span>{day.entries}</span></div><b>{day.day}</b><small className="weekday-average">{day.entries === 0 ? "sem operação" : `média ${average}`}</small><small>{day.aggregatorShare}% parceiros</small></div>; })}</div>
        </article>

        <article className="report-card card-full weekly-trend-card">
          <div className="section-title"><div><p className="kicker">Evolução de acessos</p><h2>Acessos totais por semana</h2></div><p>Janela de até 6 meses. Semanas de meses ainda não carregados aparecem como lacunas.</p></div>
          <div className="weekly-trend">{weekly.map((item, index) => <div className={`weekly-point ${item.entries === null ? "missing" : ""}`} key={item.week} title={item.entries === null ? `${item.label}: histórico pendente` : `${item.label}: ${item.entries} acessos`}><div className="weekly-bar-wrap"><i style={{ height: item.entries === null ? "0%" : `${Math.max(3, (item.entries / weeklyMax) * 100)}%` }} /></div>{(index % 2 === 0 || index === weekly.length - 1) ? <span>{item.label}</span> : <span className="ghost-label">·</span>}</div>)}</div>
          <div className="weekly-legend"><span><i />Semana com histórico</span><span><i className="missing-key" />Histórico pendente</span></div>
        </article>

        <article className="report-card card-full section-marker"><p className="kicker">02 / Receita</p><h2>Performance comercial</h2></article>

        <article className="report-card card-full revenue-card">
          <div className="section-title"><div><p className="kicker">Receita</p><h2>Performance comercial do período</h2></div><p>{revenue?.note ?? "Sem dados de venda no recorte."}</p></div>
          <div className="revenue-kpis">
            <div><span>Valor vendido</span><strong>{revenue ? money(revenue.totalValue) : "—"}</strong><small>{revenue?.salesCount ?? 0} vendas</small></div>
            <div><span>Ticket médio</span><strong>{revenue ? money(revenue.averageTicket) : "—"}</strong><small>por venda</small></div>
            <div><span>Compradores</span><strong>{revenue ? format(revenue.buyers) : "—"}</strong><small>clientes distintos</small></div>
            <div><span>Receita / comprador</span><strong>{revenue ? money(revenue.revenuePerBuyer) : "—"}</strong><small>no recorte</small></div>
            <div><span>Matrículas</span><strong>{revenue ? format(revenue.enrollments) : "—"}</strong><small>novos contratos</small></div>
            <div><span>Renovações</span><strong>{revenue ? format(revenue.reenrollments) : "—"}</strong><small>re-enrollment</small></div>
          </div>
          <div className="revenue-body">
            <div className="revenue-weekly-wrap"><p className="mini-title">Venda semanal</p><div className="revenue-weekly">{(revenue?.weekly ?? []).map((item) => <div className="revenue-week" key={item.week}><div className="revenue-week-bar"><i style={{ height: `${Math.max(4, (item.value / revenueMax) * 100)}%` }} /></div><b>{money(item.value)}</b><span>{item.label}</span><small>{item.sales} vendas</small></div>)}</div></div>
            <div className="revenue-mix"><p className="mini-title">Origem comercial</p><div className="revenue-mix-grid"><div><span>Site / totem</span><strong>{revenue ? revenue.onlineSales : 0}</strong></div><div><span>Equipe</span><strong>{revenue ? revenue.teamSales : 0}</strong></div></div><p className="mini-title products-title">Produtos / créditos mais vendidos</p><div className="product-ranking">{(revenue?.topProducts ?? []).map((item, index) => <div key={item.name}><em>{String(index + 1).padStart(2, "0")}</em><span>{item.name}</span><b>{item.quantity} un.</b><small>{money(item.value)}</small></div>)}</div></div>
          </div>
        </article>

        <CommercialHistoryChart data={data.monthly} />

        <article className="report-card card-full section-marker"><p className="kicker">03 / Professoras</p><h2>Ocupação e fidelidade à experiência</h2></article>

        <article className="report-card card-full">
          <div className="section-title"><div><p className="kicker">Professoras</p><h2>Quem sustenta a experiência</h2></div><p>Ranking por ocupação, com volume suficiente para leitura.</p></div>
          <div className="teacher-table"><div className="teacher-head"><span>Professora</span><span>Aulas</span><span>Ocupação</span><span>Vagas ocupadas</span></div>{(studio?.teachers ?? []).slice(0, 8).map((teacher, index) => <div className="teacher-line" key={teacher.name}><span><em>{String(index + 1).padStart(2, "0")}</em>{teacher.name}</span><span>{teacher.classes}</span><span className="teacher-progress"><i style={{ width: `${(teacher.occupancy / maxTeacher) * 100}%` }} />{teacher.occupancy}%</span><span>{teacher.occupied} / {teacher.capacity}</span></div>)}</div>
          <TeacherRetentionPanel data={data.clientIntelligence} />
        </article>

        <article className="report-card card-full section-marker"><p className="kicker">04 / Clientes</p><h2>Ativação, recorrência e retenção</h2></article>

        <ClientIntelligencePanel data={data.clientIntelligence} />

        <article className="report-card card-full retention-card">
          <div className="section-title"><div><p className="kicker">Retenção no recorte</p><h2>Funil filtrável de frequência</h2></div><p>{data.retentionNote}</p></div>
          <div className="retention-funnel">{funnel.map((stage, index) => <div className="retention-stage" key={stage.visits}><div className="retention-fill" style={{ width: `${Math.max(8, (stage.clients / funnelBase) * 100)}%` }}><span>{stage.label}</span><strong>{format(stage.clients)}</strong><small>{stage.shareOfBase}% da base</small></div>{index > 0 ? <div className="retention-conversion"><b>{stage.conversionFromPrevious}%</b><span>avançam da etapa anterior</span></div> : <div className="retention-conversion base"><b>100%</b><span>base observada</span></div>}</div>)}</div>
          <div className="data-caveat">Este funil respeita o filtro de período acima. A “Jornada real” usa o histórico consolidado de participantes e serve para leitura de aquisição e retenção.</div>
        </article>

        <article className="report-card card-half"><div className="section-title"><div><p className="kicker">Comportamento</p><h2>Base e retorno</h2></div><p>Leitura que amadurece junto do histórico.</p></div><div className="behavior-stack">{data.customerGroups.map((group) => <div className="behavior-item" key={group.title}><span>{group.title}</span><strong>{typeof group.value === "number" ? format(group.value) : group.value}</strong><small>{group.note}</small></div>)}</div></article>

        <article className="report-card card-full client-intelligence">
          <div className="section-title"><div><p className="kicker">Base operacional</p><h2>Quem está ativo agora</h2></div><p>{customers?.note ?? "A análise de clientes será exibida assim que o histórico estiver disponível."}</p></div>
          <div className="client-kpis">
            <div><span>Clientes ativos</span><strong>{customers ? format(customers.activeClients) : "—"}</strong><small>2+ visitas e última visita há no máximo 30 dias</small></div>
            <div><span>Visitantes no recorte</span><strong>{customers ? format(customers.periodVisitors) : "—"}</strong><small>ao menos um acesso no período filtrado</small></div>
            <div><span>1 visita recente</span><strong>{customers ? format(customers.recentOneVisitClients) : "—"}</strong><small>ainda não entram como clientes ativos</small></div>
            <div><span>Inativos 30+ dias</span><strong>{customers ? format(customers.inactive30Plus) : "—"}</strong><small>já repetiram, mas passaram de 30 dias sem voltar</small></div>
            <div><span>Frequência média</span><strong>{customers ? customers.averageFrequency : "—"}</strong><small>dias de acesso por visitante no recorte</small></div>
            <div><span>2ª visita em</span><strong>{customers?.medianDaysToSecondVisit === null || !customers ? "—" : `${customers.medianDaysToSecondVisit} dias`}</strong><small>mediana entre quem voltou no recorte</small></div>
          </div>
          {customers?.quality === "partial" ? <div className="data-caveat">Histórico em completamento: meses pendentes ({customers.missingMonths.join(", ")}). A regra de ativo já está aplicada, mas a consolidação histórica pode alterar os totais de pessoas com 2+ visitas.</div> : null}
          <div className="client-journey"><div><span>Primeiras visitas observadas</span><strong>{customers ? format(customers.observedFirstVisits) : "—"}</strong><small>primeiro acesso dentro deste recorte</small></div><div><span>Ativação em 7 dias</span><strong>{customers?.activation7 === null || !customers ? "—" : `${customers.activation7}%`}</strong><small>voltaram após a primeira visita</small></div><div><span>Ativação em 30 dias</span><strong>{customers?.activation30 === null || !customers ? "—" : `${customers.activation30}%`}</strong><small>continuidade inicial da jornada</small></div><div><span>Alta frequência</span><strong>{customers ? format(customers.frequentClients) : "—"}</strong><small>4 ou mais dias no recorte</small></div><div><span>Ativos na última semana</span><strong>{customers ? format(customers.recentActiveClients) : "—"}</strong><small>presença nos últimos 7 dias disponíveis</small></div></div>
          <div className="client-bottom"><div><p className="mini-title">Distribuição de frequência</p><div className="frequency-bands">{(customers?.frequencyBands ?? []).map((band) => <div className={`frequency-band ${band.tone}`} key={band.label}><strong>{format(band.clients)}</strong><span>{band.label}</span></div>)}</div></div><div><p className="mini-title">Clientes mais frequentes no recorte</p><div className="client-ranking">{(customers?.ranking ?? []).slice(0, 5).map((client, index) => <div key={client.name}><em>{String(index + 1).padStart(2, "0")}</em><span>{client.name}</span><b>{client.visits} dias</b><small>{client.totalVisits} no histórico</small></div>)}</div></div></div>
        </article>
      </section>

      <footer className="report-footer"><div><KoraLogo className="footer-logo" /></div><p>Dados operacionais armazenados no Supabase. A EVO é consultada somente pela sincronização interna.</p><span>ÚLTIMA VISÃO: {data.periodLabel}</span></footer>
    </main>
  );
}
