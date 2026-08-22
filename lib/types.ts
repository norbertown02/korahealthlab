export type OriginKey = "contract" | "wellhub" | "totalpass" | "classpass" | "other";

export type DashboardMetric = {
  label: string;
  value: string;
  note: string;
};

export type WeekdayMetric = {
  day: string;
  entries: number;
  uniqueClients: number;
  aggregatorShare: number;
};

export type ChannelMetric = {
  label: string;
  value: number;
  tone: string;
};

export type SlotMetric = {
  slot: string;
  entries: number;
  uniqueClients: number;
  mix: Record<OriginKey, number>;
};

export type MonthlyMetric = {
  month: string;
  entries: number;
  sales: number;
};

export type SegmentMetric = {
  title: string;
  value: number;
  note: string;
  accent: string;
};

export type ActionMetric = {
  title: string;
  tag: string;
  detail: string;
};

export type SourceStatus = {
  name: string;
  endpoint: string;
  usage: string;
  status: string;
};

export type DashboardPayload = {
  description: string;
  periodLabel: string;
  heroMix: string;
  summaryNote: string;
  syncLabel: string;
  summaryCards: DashboardMetric[];
  weekday: WeekdayMetric[];
  originEntries: ChannelMetric[];
  slotMix: SlotMetric[];
  monthly: MonthlyMetric[];
  customerGroups: SegmentMetric[];
  teachers: Array<{
    name: string;
    classes: number;
    occupancy: number;
    returnRate: number;
  }>;
  actions: ActionMetric[];
  sources: SourceStatus[];
};

export type EvoEntry = {
  idMember?: number | null;
  nameMember?: string | null;
  nameProspect?: string | null;
  date?: string | null;
  dateTurn?: string | null;
  idBranch?: number | null;
  entryType?: string | null;
  device?: string | null;
};

export type EvoAggregatorCheckin = {
  idMember?: number | null;
  name?: string | null;
  aggregator?: string | null;
  checkinDate?: string | null;
  checkinTime?: string | null;
  checkinBranchId?: number | null;
  status?: string | null;
  tokenUsed?: string | null;
};

export type EvoSaleItem = {
  item?: string | null;
  description?: string | null;
  saleValue?: number | null;
  saleValueWithoutCreditValue?: number | null;
  quantity?: number | null;
};

export type EvoReceivable = {
  ammount?: number | null;
  ammountPaid?: number | null;
};

export type EvoSale = {
  idSale: number;
  idMember?: number | null;
  idBranch?: number | null;
  saleDate?: string | null;
  saleDateServer?: string | null;
  updateDate?: string | null;
  saleItens?: EvoSaleItem[] | null;
  receivables?: EvoReceivable[] | null;
  [key: string]: unknown;
};

export type SyncWindow = {
  dateStart: string;
  dateEnd: string;
};
