type MonthlyPoint = { month: string; entries: number; sales: number };

function smoothPath(points: Array<[number, number]>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return path;
}

function percentDelta(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function CommercialHistoryChart({ data }: { data: MonthlyPoint[] }) {
  if (!data.length) return null;

  const width = 1000;
  const height = 330;
  const left = 72;
  const right = 72;
  const top = 34;
  const bottom = 56;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const entriesMax = Math.max(1, ...data.map((item) => item.entries));
  const salesMax = Math.max(1, ...data.map((item) => item.sales));
  const x = (index: number) => left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
  const yEntries = (value: number) => top + chartHeight - (value / entriesMax) * chartHeight;
  const ySales = (value: number) => top + chartHeight - (value / salesMax) * chartHeight;
  const entryPoints = data.map((item, index) => [x(index), yEntries(item.entries)] as [number, number]);
  const salesPoints = data.map((item, index) => [x(index), ySales(item.sales)] as [number, number]);
  const entryPath = smoothPath(entryPoints);
  const salesPath = smoothPath(salesPoints);
  const entryArea = `${entryPath} L ${entryPoints.at(-1)?.[0] ?? left} ${top + chartHeight} L ${entryPoints[0][0]} ${top + chartHeight} Z`;
  const totalEntries = data.reduce((sum, item) => sum + item.entries, 0);
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const last = data.at(-1)!;
  const previous = data.at(-2);
  const entriesDelta = previous ? percentDelta(last.entries, previous.entries) : null;
  const salesDelta = previous ? percentDelta(last.sales, previous.sales) : null;

  return (
    <article className="report-card card-full commercial-history-card">
      <div className="commercial-history-head">
        <div>
          <p className="kicker">Histórico comercial</p>
          <h2>Entradas x vendas</h2>
          <p className="commercial-history-subtitle">Duas curvas, duas leituras: movimento do estúdio e resposta comercial ao longo do tempo.</p>
        </div>
        <div className="commercial-history-summary">
          <div><span>Entradas acumuladas</span><strong>{totalEntries.toLocaleString("pt-BR")}</strong></div>
          <div><span>Vendas acumuladas</span><strong>{totalSales.toLocaleString("pt-BR")}</strong></div>
        </div>
      </div>

      <div className="commercial-history-latest">
        <span>Último mês</span>
        <strong>{last.month}</strong>
        <div><i className="entry-dot" />{last.entries.toLocaleString("pt-BR")} entradas {entriesDelta !== null ? <b className={entriesDelta >= 0 ? "positive" : "negative"}>{entriesDelta >= 0 ? "+" : ""}{entriesDelta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</b> : null}</div>
        <div><i className="sales-dot" />{last.sales.toLocaleString("pt-BR")} vendas {salesDelta !== null ? <b className={salesDelta >= 0 ? "positive" : "negative"}>{salesDelta >= 0 ? "+" : ""}{salesDelta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</b> : null}</div>
      </div>

      <div className="commercial-chart-wrap">
        <svg className="commercial-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução mensal de entradas e vendas">
          <defs>
            <linearGradient id="commercial-entry-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8c89d" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#b8c89d" stopOpacity="0" />
            </linearGradient>
            <filter id="commercial-entry-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="commercial-sales-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = top + chartHeight - step * chartHeight;
            return <line key={step} x1={left} x2={width - right} y1={y} y2={y} className="commercial-grid-line" />;
          })}

          {[0, 0.5, 1].map((step) => (
            <g key={`axis-${step}`}>
              <text x={left - 16} y={top + chartHeight - step * chartHeight + 4} textAnchor="end" className="commercial-axis-label entry-axis">{Math.round(entriesMax * step)}</text>
              <text x={width - right + 16} y={top + chartHeight - step * chartHeight + 4} className="commercial-axis-label sales-axis">{Math.round(salesMax * step)}</text>
            </g>
          ))}

          <path d={entryArea} fill="url(#commercial-entry-area)" />
          <path d={entryPath} className="commercial-entry-line" filter="url(#commercial-entry-glow)" />
          <path d={salesPath} className="commercial-sales-line" filter="url(#commercial-sales-glow)" />

          {data.map((item, index) => (
            <g key={item.month}>
              <line x1={x(index)} x2={x(index)} y1={top} y2={top + chartHeight} className="commercial-vertical-guide" />
              <circle cx={entryPoints[index][0]} cy={entryPoints[index][1]} r="6.5" className="commercial-entry-point"><title>{item.month}: {item.entries} entradas</title></circle>
              <circle cx={salesPoints[index][0]} cy={salesPoints[index][1]} r="5.5" className="commercial-sales-point"><title>{item.month}: {item.sales} vendas</title></circle>
              <text x={x(index)} y={height - 18} textAnchor="middle" className="commercial-month-label">{item.month}</text>
              <text x={entryPoints[index][0]} y={Math.max(top + 12, entryPoints[index][1] - 13)} textAnchor="middle" className="commercial-value-label entry-value">{item.entries}</text>
              <text x={salesPoints[index][0]} y={Math.min(top + chartHeight - 8, salesPoints[index][1] + 20)} textAnchor="middle" className="commercial-value-label sales-value">{item.sales}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="commercial-chart-footer">
        <span><i className="entry-dot" />Entradas <small>escala esquerda</small></span>
        <span><i className="sales-dot" />Vendas <small>escala direita</small></span>
        <p>Escalas independentes preservam a leitura das duas tendências sem achatar a curva de vendas.</p>
      </div>
    </article>
  );
}
