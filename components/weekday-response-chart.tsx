import type { WeekdayMetric } from "@/lib/types";

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

function oneDecimal(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function WeekdayResponseChart({
  current,
  currentStart,
  currentEnd
}: {
  current: WeekdayMetric[];
  currentStart: string;
  currentEnd: string;
}) {
  const metrics = current.map((day, index) => {
    const occurrences = weekdayOccurrences(currentStart, currentEnd, index);
    const average = occurrences ? day.entries / occurrences : 0;
    return { day, average, occurrences };
  });

  const maxAverage = Math.max(1, ...metrics.map((item) => item.average));

  return (
    <article className="report-card card-half weekday-response-card">
      <div className="section-title">
        <div><p className="kicker">Ritmo semanal</p><h2>Onde a semana responde</h2></div>
        <p>Média real de acessos por ocorrência de cada dia da semana no período observado.</p>
      </div>

      <div className="weekday-strip weekday-average-chart">
        {metrics.map((metric) => {
          const barHeight = metric.average > 0 ? Math.max(7, (metric.average / maxAverage) * 100) : 0;
          return (
            <div
              className="weekday-col"
              key={metric.day.day}
              title={`${metric.day.day}: média ${oneDecimal(metric.average)} acessos em ${metric.occurrences} ocorrências`}
            >
              <div className="weekday-bar-zone">
                <div className="weekday-bar average-bar" style={{ height: `${barHeight}%` }}>
                  <span>{oneDecimal(metric.average)}</span>
                </div>
              </div>
              <b>{metric.day.day}</b>
              <small className="weekday-average-caption">{metric.occurrences}x · média de acessos</small>
            </div>
          );
        })}
      </div>

      <div className="weekday-chart-legend">
        <span><i className="legend-average" />Altura = média de acessos daquele dia da semana</span>
      </div>
    </article>
  );
}
