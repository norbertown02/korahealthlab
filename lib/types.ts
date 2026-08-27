export type OriginKey = "contract" | "wellhub" | "totalpass" | "classpass" | "other";

export type DashboardMetric = { label: string; value: string; note: string };
export type WeekdayMetric = { day: string; entries: number; averageEntries?: number | null; uniqueClients: number; aggregatorShare: number };
export type ChannelMetric = { label: string; value: number; tone: string };
export type SlotMetric = { slot: string; entries: number; uniqueClients: number; mix: Record<OriginKey, number> };
export type MonthlyMetric = { month: string; entries: number; sales: number };
export type WeeklyTrendMetric = { week: string; label: string; entries: number | null; available: boolean };
export type RevenueInsight = {
  salesCount: number;
  totalValue: number;
  averageTicket: number;
  buyers: number;
  revenuePerBuyer: number;
  enrollments: number;
  reenrollments: number;
  onlineSales: number;
  teamSales: number;
  weekly: Array<{ week: string; label: string; sales: number; value: number }>;
  topProducts: Array<{ name: string; quantity: number; value: number }>;
  note: string;
};
export type RetentionStage = {
  visits: number;
  label: string;
  clients: number;
  shareOfBase: number;
  conversionFromPrevious: number;
};
export type SegmentMetric = { title: string; value: number; note: string; accent: string };
export type ActionMetric = { title: string; tag: string; detail: string };
export type SourceStatus = { name: string; endpoint: string; usage: string; status: string };

export type CustomerInsights = {
  filters: { start: string; end: string; observedEnd: string };
  quality: "partial" | "complete";
  missingMonths: string[];
  totalClients: number;
  activeClients: number;
  periodVisitors: number;
  recentOneVisitClients: number;
  inactive30Plus: number;
  returningClients: number;
  newClients: number;
  averageFrequency: number;
  weeklyFrequency: number;
  frequencyBands: Array<{ label: string; min: number; max: number; tone: string; clients: number }>;
  activation7: number | null;
  activation30: number | null;
  repeatRate: number;
  consistencyRate: number;
  frequentClients: number;
  medianDaysToSecondVisit: number | null;
  recentActiveClients: number;
  dormantInPeriod: number;
  observedFirstVisits: number;
  periodWeekCount: number;
  ranking: Array<{ name: string; visits: number; totalVisits: number; lastVisit: string }>;
  risk: Array<{ name: string; daysAway: number; visits: number; lastVisit: string }>;
  note: string;
};

export type ClientIntelligence = {
  source: string;
  period_start: string;
  period_end: string;
  source_period_end?: string;
  updated_at?: string;
  identity_method: string;
  overall: {
    unique_visitors: number;
    repeaters: number;
    repeat_rate: number;
    active_clients: number;
    risk_clients: number;
    lost_clients: number;
    new_recent_one_visit: number;
    funnel: Array<{ visits: number; clients: number }>;
  };
  acquisition_monthly: Array<{
    month: string;
    new: number;
    wellhub: number;
    totalpass: number;
    direct: number;
    repeat2: number;
    repeat3: number;
    repeat5: number;
    repeat_rate: number;
    d30_n: number;
    d30_rate: number | null;
  }>;
  origin_retention: Array<{
    origin: string;
    new: number;
    d7_eligible: number;
    d7_returned: number;
    d7_rate: number | null;
    d14_eligible: number;
    d14_returned: number;
    d14_rate: number | null;
    d30_eligible: number;
    d30_returned: number;
    d30_rate: number | null;
    repeat2: number;
    repeat2_rate: number;
    repeat3: number;
    repeat5: number;
  }>;
  teacher_retention: {
    valid_from: string;
    note: string;
    rows: Array<{
      teacher: string;
      first_experiences: number;
      d7_eligible: number;
      d7_returned: number;
      d7_rate: number | null;
      d14_eligible: number;
      d14_returned: number;
      d14_rate: number | null;
      d30_eligible: number;
      d30_returned: number;
      d30_rate: number | null;
      repeat2: number;
      repeat2_rate: number;
      repeat3: number;
      repeat5: number;
      same_teacher_returners: number;
      same_teacher_rate: number | null;
    }>;
  };
};

export type StudioInsights = {
  filters: { start: string; end: string; classType: "all" | "hot-sculpt" | "yoga" };
  totalSessions: number;
  capacity: number;
  occupied: number;
  occupancy: number;
  cancelledSessions: number;
  pendingSessions: number;
  modalities: Array<{ key: string; name: string; sessions: number; capacity: number; occupied: number; occupancy: number }>;
  teachers: Array<{ name: string; classes: number; capacity: number; occupied: number; occupancy: number }>;
  timeWindows: Array<{ hour: number; label: string; sessions: number; capacity: number; occupied: number; occupancy: number }>;
  days: Array<{ day: string; sessions: number; capacity: number; occupied: number; occupancy: number }>;
  opportunities: Array<{ tone: string; title: string; detail: string }>;
};

export type DashboardFilters = {
  start?: string;
  end?: string;
  classType?: "all" | "hot-sculpt" | "yoga";
  view?: "month" | "quarter" | "year";
  month?: string;
  quarter?: string;
  year?: string;
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
  weeklyTrend?: WeeklyTrendMetric[];
  weeklyTrendStart?: string;
  totalSalesValue?: number;
  revenue?: RevenueInsight;
  retentionFunnel?: RetentionStage[];
  retentionNote?: string;
  customerGroups: SegmentMetric[];
  teachers: Array<{ name: string; classes: number; occupancy: number; returnRate: number }>;
  actions: ActionMetric[];
  sources: SourceStatus[];
  filters?: { start: string; end: string };
  studio?: StudioInsights;
  customers?: CustomerInsights;
  clientIntelligence?: ClientIntelligence | null;
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
  [key: string]: unknown;
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
  [key: string]: unknown;
};
export type EvoSaleItem = {
  item?: string | null;
  description?: string | null;
  saleValue?: number | null;
  saleValueWithoutCreditValue?: number | null;
  quantity?: number | null;
};
export type EvoReceivable = { ammount?: number | null; ammountPaid?: number | null };
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
export type SyncWindow = { dateStart: string; dateEnd: string };