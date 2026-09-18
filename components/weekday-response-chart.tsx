import type { WeekdayMetric } from "@/lib/types";

type PreviousWeekdayPeriod = {
  weekday: WeekdayMetric[];
  start: string;
  end: string;
};

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
  currentEnd,
  previous
}: {
  current: WeekdayMetric[];
  currentStart: string;
  currentEnd: string;
  previous?: PreviousWeekdayPeriod | null;
}) {
  const metrics = current.map((day, index) => {
    const occurrences = weekdayOccurrences(currentStart, currentEnd, index);
    const average = occurrences ? day.entries / occurrences : 0;
    const previousDay = previous?.weekday.find((item) => item.day === day.day) ?? previous?.weekday[index];
    const previousOccurrences = previous ? weekdayOccurrences(previous.start, previous.end, index) : 0;
    const previousAverage = previousDay && previousOccurrences ? previousDay.entries / previousOccurrences : null;

    let delta: number | null = null;
    let deltaLabel = "—";
    let deltaTone = "neutral";

    if (occurrences > 0 && previousAverage !== null) {
      if (previousAverage === 0) {
        if (average > 0) {
          deltaLabel = "novo";
          deltaTone = "positive";
        } else {
          delta = 0;
          deltaLabel = "0%";
        }
      } else {
        delta = ((average - previousAverage) / previousAverage) * 100;
        deltaLabel = `${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
        deltaTone = delta > 0.4 ? "positive" : delta < -0.4 ? "negative" : "neutral";
      }
    }

    return { day, average, previousAverage, delta, deltaLabel, deltaTone, occurrences };
  });

  const maxAverage = Math.max(1, ...metrics.map((item) => item.average));

  return (
    <article className="report-card card-half weekday-response-card">
      <div className="section-title">
        <div><p className="kicker">Ritmo semanal</p><h2>Onde a semana responde</h2></div>
        <p>Média de acessos por ocorrência de cada dia. O selo mostra a variação contra o período anterior.</p>
      </div>

      <div className="weekday-strip weekday-average-chart">
        {metrics.map((metric) => {
          const barHeight = metric.average > 0 ? Math.max(7, (metric.average / maxAverage) * 100) : 0;
          const previousText = metric.previousAverage === null ? "sem base anterior" : `período anterior: média ${oneDecimal(metric.previousAverage)}`;
          return (
            <div className="weekday-col" key={metric.day.day} title={`${metric.day.day}: média ${oneDecimal(metric.average)} acessos · ${previousText}`}>
              <div className={`weekday-delta ${metric.deltaTone}`}>
                <span>{metric.deltaLabel}</span>
                <small>vs ant.</small>
              </div>
              <div className="weekday-bar-zone">
                <div className="weekday-bar average-bar" style={{ height: `${barHeight}%` }}>
                  <span>{oneDecimal(metric.average)}</span>
                </div>
              </div>
              <b>{metric.day.day}</b>
              <small className="weekday-average-caption">média de acessos</small>
            </div>
          );
        })}
      </div>

      <div className="weekday-chart-legend">
        <span><i className="legend-average" />Altura = média de acessos</span>
        <span><i className="legend-delta" />% = comparação com período anterior</span>
      </div>
    </article>
  );
}
