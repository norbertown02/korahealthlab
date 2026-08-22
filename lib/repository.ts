import { getPool } from "@/lib/db";
import type { DashboardPayload, EvoAggregatorCheckin, EvoEntry, EvoSale, SyncWindow } from "@/lib/types";

type PersistPayload = {
  window: SyncWindow;
  dashboard: DashboardPayload;
  entries: EvoEntry[];
  aggregators: EvoAggregatorCheckin[];
  sales: EvoSale[];
};

export async function persistSync(payload: PersistPayload) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(
      `
        insert into sync_runs (period_start, period_end, status, entries_count, aggregators_count, sales_count, dashboard_snapshot)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payload.window.dateStart,
        payload.window.dateEnd,
        "completed",
        payload.entries.length,
        payload.aggregators.length,
        payload.sales.length,
        JSON.stringify(payload.dashboard)
      ]
    );

    await client.query("delete from fact_entries where entry_date between $1 and $2", [
      payload.window.dateStart,
      payload.window.dateEnd
    ]);
    await client.query("delete from fact_aggregator_checkins where checkin_date between $1 and $2", [
      payload.window.dateStart,
      payload.window.dateEnd
    ]);
    await client.query("delete from fact_sales where sale_date between $1 and $2", [
      payload.window.dateStart,
      payload.window.dateEnd
    ]);

    for (const entry of payload.entries) {
      await client.query(
        `
          insert into fact_entries (
            id_member,
            member_name,
            entry_date,
            entry_timestamp,
            branch_id,
            entry_type,
            device,
            raw_payload
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          entry.idMember ?? null,
          entry.nameMember ?? entry.nameProspect ?? null,
          (entry.date ?? entry.dateTurn ?? "").slice(0, 10) || null,
          entry.date ?? entry.dateTurn ?? null,
          entry.idBranch ?? null,
          entry.entryType ?? null,
          entry.device ?? null,
          JSON.stringify(entry)
        ]
      );
    }

    for (const item of payload.aggregators) {
      await client.query(
        `
          insert into fact_aggregator_checkins (
            id_member,
            member_name,
            aggregator_name,
            checkin_date,
            checkin_timestamp,
            branch_id,
            status,
            raw_payload
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          item.idMember ?? null,
          item.name ?? null,
          item.aggregator ?? null,
          item.checkinDate?.slice(0, 10) ?? null,
          item.checkinDate ?? null,
          item.checkinBranchId ?? null,
          item.status ?? null,
          JSON.stringify(item)
        ]
      );
    }

    for (const sale of payload.sales) {
      await client.query(
        `
          insert into fact_sales (
            id_sale,
            id_member,
            branch_id,
            sale_date,
            sale_timestamp,
            raw_payload
          ) values ($1, $2, $3, $4, $5, $6)
          on conflict (id_sale) do update
          set id_member = excluded.id_member,
              branch_id = excluded.branch_id,
              sale_date = excluded.sale_date,
              sale_timestamp = excluded.sale_timestamp,
              raw_payload = excluded.raw_payload
        `,
        [
          sale.idSale,
          sale.idMember ?? null,
          sale.idBranch ?? null,
          sale.saleDate?.slice(0, 10) ?? sale.saleDateServer?.slice(0, 10) ?? null,
          sale.saleDate ?? sale.saleDateServer ?? null,
          JSON.stringify(sale)
        ]
      );
    }

    await client.query(
      `
        insert into dashboard_snapshots (period_start, period_end, payload)
        values ($1, $2, $3)
      `,
      [payload.window.dateStart, payload.window.dateEnd, JSON.stringify(payload.dashboard)]
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLatestDashboard() {
  const pool = getPool();
  const result = await pool.query(
    `
      select payload
      from dashboard_snapshots
      order by created_at desc
      limit 1
    `
  );

  return result.rows[0]?.payload ?? null;
}
