import { getSupabaseAdmin } from "@/lib/db";
import type { DashboardPayload, EvoAggregatorCheckin, EvoEntry, EvoSale, SyncWindow } from "@/lib/types";

type PersistPayload = {
  window: SyncWindow;
  dashboard: DashboardPayload;
  entries: EvoEntry[];
  aggregators: EvoAggregatorCheckin[];
  sales: EvoSale[];
};

export async function persistSync(payload: PersistPayload) {
  const supabase = getSupabaseAdmin();

  const { error: syncRunError } = await supabase.from("sync_runs").insert({
    period_start: payload.window.dateStart,
    period_end: payload.window.dateEnd,
    status: "completed",
    entries_count: payload.entries.length,
    aggregators_count: payload.aggregators.length,
    sales_count: payload.sales.length,
    dashboard_snapshot: payload.dashboard
  });

  if (syncRunError) throw syncRunError;

  if (payload.entries.length) {
    const { error } = await supabase.from("fact_entries").insert(
      payload.entries.map((entry) => ({
        id_member: entry.idMember ?? null,
        member_name: entry.nameMember ?? entry.nameProspect ?? null,
        entry_date: (entry.date ?? entry.dateTurn ?? "").slice(0, 10) || null,
        entry_timestamp: entry.date ?? entry.dateTurn ?? null,
        branch_id: entry.idBranch ?? null,
        entry_type: entry.entryType ?? null,
        device: entry.device ?? null,
        raw_payload: entry
      }))
    );
    if (error) throw error;
  }

  if (payload.aggregators.length) {
    const { error } = await supabase.from("fact_aggregator_checkins").insert(
      payload.aggregators.map((item) => ({
        id_member: item.idMember ?? null,
        member_name: item.name ?? null,
        aggregator_name: item.aggregator ?? null,
        checkin_date: item.checkinDate?.slice(0, 10) ?? null,
        checkin_timestamp: item.checkinDate ?? null,
        branch_id: item.checkinBranchId ?? null,
        status: item.status ?? null,
        raw_payload: item
      }))
    );
    if (error) throw error;
  }

  if (payload.sales.length) {
    const { error } = await supabase.from("fact_sales").upsert(
      payload.sales.map((sale) => ({
        id_sale: sale.idSale,
        id_member: sale.idMember ?? null,
        branch_id: sale.idBranch ?? null,
        sale_date: sale.saleDate?.slice(0, 10) ?? sale.saleDateServer?.slice(0, 10) ?? null,
        sale_timestamp: sale.saleDate ?? sale.saleDateServer ?? null,
        raw_payload: sale
      })),
      { onConflict: "id_sale" }
    );
    if (error) throw error;
  }

  const { error: snapshotError } = await supabase.from("dashboard_snapshots").insert({
    period_start: payload.window.dateStart,
    period_end: payload.window.dateEnd,
    payload: payload.dashboard
  });

  if (snapshotError) throw snapshotError;
}

export async function getLatestDashboard() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .select("payload")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.payload ?? null;
}
