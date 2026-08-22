import { buildDashboardPayload, periodWindow } from "@/lib/dashboard";
import { fetchAggregatorCheckins, fetchEntries, fetchSales } from "@/lib/evo-client";
import { persistSync } from "@/lib/repository";

export async function runSync(date = new Date()) {
  const window = periodWindow(date);
  const [entries, aggregators, sales] = await Promise.all([
    fetchEntries(window),
    fetchAggregatorCheckins(window),
    fetchSales(window)
  ]);

  const dashboard = buildDashboardPayload(entries, aggregators, sales, window);

  await persistSync({
    window,
    dashboard,
    entries,
    aggregators,
    sales
  });

  return dashboard;
}
