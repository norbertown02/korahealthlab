create table if not exists sync_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  status text not null,
  entries_count integer not null default 0,
  aggregators_count integer not null default 0,
  sales_count integer not null default 0,
  dashboard_snapshot jsonb not null
);

create table if not exists fact_entries (
  id bigserial primary key,
  id_member integer,
  member_name text,
  entry_date date,
  entry_timestamp timestamptz,
  branch_id integer,
  entry_type text,
  device text,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists fact_entries_entry_date_idx on fact_entries (entry_date);
create index if not exists fact_entries_member_idx on fact_entries (id_member);

create table if not exists fact_aggregator_checkins (
  id bigserial primary key,
  id_member integer,
  member_name text,
  aggregator_name text,
  checkin_date date,
  checkin_timestamp timestamptz,
  branch_id integer,
  status text,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists fact_aggregator_checkins_date_idx on fact_aggregator_checkins (checkin_date);

create table if not exists fact_sales (
  id_sale bigint primary key,
  id_member integer,
  branch_id integer,
  sale_date date,
  sale_timestamp timestamptz,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fact_sales_sale_date_idx on fact_sales (sale_date);

create table if not exists dashboard_snapshots (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  payload jsonb not null
);
