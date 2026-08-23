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

export function DashboardShell({
  data,
  filters
}: {
  data: DashboardPayload;
  filters: DashboardFilters;
}) {
  const studio = data.studio;
  const maxOrigin = Math.max(1, ...data.originEntries.map((item) => item.value));
  const maxTime = Math.max(1, ...(studio?.timeWindows.map((item) => item.occupancy) ?? [1]));
  const maxTeacher = Math.max(1, ...(studio?.teachers.map((item) => item.occupancy) ?? [1]));
  const currentClass = filters.classType ?? "all";
  const start = data.filters?.start ?? filters.start ?? "";
  const end = data.filters?.end ?? filters.end ?? "";

  return (
    <main className="kora-report">
      <header className="topbar">
        <div className="brand-lockup">
          <KoraLogo className="brand-logo" />
          <span>PRIVATE STUDIO REPORT</span>
        </div>
        <div className="topbar-meta">
          <span className="live-dot" />
          Histórico salvo e auditável
        </div>
      </header>

      <section className="hero-kora">
        <div className="hero-copy-kora">
          <p className="kicker">Kora Health Lab / visão de gestão</p>
          <h1>O corpo da operação,<br /><i>visto com calma.</i></h1>
          <p className="hero-description">
            Leia demanda, capacidade e recorrência para decidir onde expandir, ajustar ou proteger a experiência do estúdio.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-label">MOVIMENTO<br />COM INTENÇÃO</span>
          <span className="orbit-ring ring-a" />
          <span className="orbit-ring ring-b" />
        </div>
        <div className="hero-stat">
          <span>recorte atual</span>
          <strong>{data.periodLabel}</strong>
          <small>{data.heroMix}</small>
        </div>
      </section>

      <form className="filter-deck" action="/" method="get">
        <div className="filter-title">
          <span>Recorte</span>
          <strong>Escolha o que quer entender</strong>
        </div>
        <label>
          <span>De</span>
          <input name="start" type="date" defaultValue={start} />
        </label>
        <label>
          <span>Até</span>
          <input name="end" type="date" defaultValue={end} />
        </label>
        <label className="filter-wide">
          <span>Modalidade</span>
          <select name="classType" defaultValue={currentClass}>
            {classOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button type="submit">Atualizar visão</button>
      </form>

      <section className="signal-row">
        <div className="signal-intro">
          <p className="kicker">Sinais do período</p>
          <h2>O que merece atenção agora.</h2>
        </div>
        <div className="signal-cards">
          {(data.actions.length ? data.actions : [{ tag: "base", title: "Histórico em construção", detail: "Os sinais de decisão aparecem conforme as aulas são sincronizadas." }]).map((item) => (
            <article className="signal-card" key={item.title}>
              <span className={`signal-tag ${item.tag}`}>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="metric-ribbon">
        {data.summaryCards.slice(0, 7).map((item, index) => (
          <article className={`ribbon-card ribbon-${index}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </section>

      <section className="report-grid">
        <article className="report-card card-wide card-dark">
          <div className="section-title light-title">
            <div>
              <p className="kicker">Modalidades</p>
              <h2>Ocupação por prática</h2>
            </div>
            <p>Capacidade ocupada, não apenas entradas no estúdio.</p>
          </div>
          <div className="modality-grid">
            {(studio?.modalities ?? []).map((modality) => (
              <div className="modality-card" key={modality.key}>
                <div className="modality-top"><span>{modality.name}</span><b>{modality.occupancy}%</b></div>
                <div className="occupancy-track"><span style={{ width: `${modality.occupancy}%` }} /></div>
                <div className="modality-bottom">
                  <span>{format(modality.sessions)} aulas</span>
                  <span>{format(modality.occupied)} / {format(modality.capacity)} vagas</span>
                </div>
              </div>
            ))}
          </div>
          <div className="modality-note">Hot Yoga é lido dentro de Yoga para que a decisão de grade compare famílias de prática, sem diluir a operação.</div>
        </article>

        <article className="report-card card-tall">
          <div className="section-title">
            <div>
              <p className="kicker">Capacidade</p>
              <h2>Quando a casa enche</h2>
            </div>
            <p>Ocupação por horário de início.</p>
          </div>
          <div className="time-ladder">
            {(studio?.timeWindows ?? []).map((window) => (
              <div className="time-row" key={window.label}>
                <span>{window.label}</span>
                <div className="time-bar"><i style={{ width: `${(window.occupancy / maxTime) * 100}%` }} /></div>
                <b>{window.occupancy}%</b>
                <small>{window.sessions} aulas</small>
              </div>
            ))}
          </div>
        </article>

        <article className="report-card card-half">
          <div className="section-title">
            <div>
              <p className="kicker">Canais</p>
              <h2>De onde vem a presença</h2>
            </div>
            <p>Uma entrada, uma origem.</p>
          </div>
          <div className="origin-list">
            {data.originEntries.map((item) => (
              <div className="origin-row" key={item.label}>
                <span>{item.label}</span>
                <div><i style={{ width: `${(item.value / maxOrigin) * 100}%`, background: item.tone }} /></div>
                <b>{format(item.value)}</b>
              </div>
            ))}
          </div>
          <small className="footnote">Agregadores classificam o acesso existente; não são somados ao total novamente.</small>
        </article>

        <article className="report-card card-half">
          <div className="section-title">
            <div>
              <p className="kicker">Ritmo semanal</p>
              <h2>Onde a semana responde</h2>
            </div>
            <p>Acessos e peso de agregadores.</p>
          </div>
          <div className="weekday-strip">
            {data.weekday.map((day) => {
              const height = Math.max(14, day.entries / Math.max(1, ...data.weekday.map((item) => item.entries)) * 112);
              return <div className="weekday-col" key={day.day}>
                <div className="weekday-bar" style={{ height }}><span>{day.entries}</span></div>
                <b>{day.day}</b>
                <small>{day.aggregatorShare}% parceiros</small>
              </div>;
            })}
          </div>
        </article>

        <article className="report-card card-wide">
          <div className="section-title">
            <div>
              <p className="kicker">Professoras</p>
              <h2>Quem sustenta a experiência</h2>
            </div>
            <p>Ranking por ocupação, com volume suficiente para leitura.</p>
          </div>
          <div className="teacher-table">
            <div className="teacher-head"><span>Professora</span><span>Aulas</span><span>Ocupação</span><span>Vagas ocupadas</span></div>
            {(studio?.teachers ?? []).slice(0, 8).map((teacher, index) => (
              <div className="teacher-line" key={teacher.name}>
                <span><em>{String(index + 1).padStart(2, "0")}</em>{teacher.name}</span>
                <span>{teacher.classes}</span>
                <span className="teacher-progress"><i style={{ width: `${(teacher.occupancy / maxTeacher) * 100}%` }} />{teacher.occupancy}%</span>
                <span>{teacher.occupied} / {teacher.capacity}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="report-card card-half">
          <div className="section-title">
            <div>
              <p className="kicker">Comportamento</p>
              <h2>Base e retorno</h2>
            </div>
            <p>Leitura que amadurece junto do histórico.</p>
          </div>
          <div className="behavior-stack">
            {data.customerGroups.map((group) => (
              <div className="behavior-item" key={group.title}>
                <span>{group.title}</span>
                <strong>{typeof group.value === "number" ? format(group.value) : group.value}</strong>
                <small>{group.note}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="report-card card-half">
          <div className="section-title">
            <div>
              <p className="kicker">Histórico</p>
              <h2>Entradas x vendas</h2>
            </div>
            <p>Não compare uma entrada com uma venda: são sinais distintos.</p>
          </div>
          <div className="month-compare">
            {data.monthly.map((month) => {
              const max = Math.max(1, ...data.monthly.map((item) => item.entries));
              return <div className="month-block" key={month.month}>
                <div className="month-stacks">
                  <i className="entry" style={{ height: `${(month.entries / max) * 116}px` }} />
                  <i className="sales" style={{ height: `${Math.max(12, month.sales / max * 116)}px` }} />
                </div>
                <b>{month.month}</b>
                <small>{month.entries} acessos / {month.sales} vendas</small>
              </div>;
            })}
          </div>
        </article>
      </section>

      <footer className="report-footer">
        <div><KoraLogo className="footer-logo" /></div>
        <p>Dados operacionais armazenados no Supabase. A EVO é consultada somente pela sincronização interna.</p>
        <span>ÚLTIMA VISÃO: {data.periodLabel}</span>
      </footer>
    </main>
  );
}
