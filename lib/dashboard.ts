import type {
  DashboardPayload,
  EvoAggregatorCheckin,
  EvoEntry,
  EvoSale,
  OriginKey,
  SyncWindow
} from "@/lib/types";

type UnifiedEntry = {
  client: string;
  date: string;
  time: string;
  weekday: number | null;
  hour: number | null;
  origin: OriginKey;
  idMember?: number | null;
};

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function periodWindow(date = new Date()): SyncWindow {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

  return {
    dateStart: start.toISOString().slice(0, 10),
    dateEnd: end.toISOString().slice(0, 10)
  };
}

function parseDateTime(value?: string | null) {
  if (!value) {
    return { date: "", time: "", weekday: null, hour: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: value.slice(0, 10),
      time: value.slice(11, 16),
      weekday: null,
      hour: null
    };
  }

  return {
    date: parsed.toISOString().slice(0, 10),
    time: `${String(parsed.getUTCHours()).padStart(2, "0")}:${String(parsed.getUTCMinutes()).padStart(2, "0")}`,
    weekday: (parsed.getUTCDay() + 6) % 7,
    hour: parsed.getUTCHours()
  };
}

function originFromAggregator(value?: string | null): OriginKey {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("wellhub") || normalized.includes("gympass")) return "wellhub";
  if (normalized.includes("totalpass")) return "totalpass";
  if (normalized.includes("classpass")) return "classpass";
  return "other";
}

function slotLabel(hour: number | null) {
  if (hour === null) return "Sem horário";
  if (hour >= 6 && hour < 8) return "06:00 - 08:00";
  if (hour >= 8 && hour < 12) return "08:00 - 12:00";
  if (hour >= 12 && hour < 14) return "12:00 - 14:00";
  if (hour >= 14 && hour < 17) return "14:00 - 17:00";
  if (hour >= 17 && hour < 19) return "17:00 - 19:00";
  if (hour >= 19 && hour < 21) return "19:00 - 21:00";
  return "Outros horários";
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
}

function saleValue(sale: EvoSale) {
  const items = sale.saleItens ?? [];
  const receivables = sale.receivables ?? [];

  const itemTotal = items.reduce((sum, item) => {
    const value = item.saleValueWithoutCreditValue ?? item.saleValue ?? 0;
    return sum + Number(value);
  }, 0);

  if (itemTotal > 0) {
    return itemTotal;
  }

  const paid = receivables.reduce((sum, receivable) => sum + Number(receivable.ammountPaid ?? 0), 0);
  if (paid > 0) {
    return paid;
  }

  return receivables.reduce((sum, receivable) => sum + Number(receivable.ammount ?? 0), 0);
}

function contractSale(sale: EvoSale) {
  const serialized = JSON.stringify(sale).toLowerCase();
  return ["membership", "contrato", "plano", "crédito", "credito", "sessões", "sessoes"].some((token) =>
    serialized.includes(token)
  );
}

export function unifyEntries(entries: EvoEntry[], aggregators: EvoAggregatorCheckin[]) {
  const direct: UnifiedEntry[] = entries.map((entry) => {
    const parsed = parseDateTime(entry.date ?? entry.dateTurn);
    return {
      client: entry.nameMember ?? entry.nameProspect ?? "Cliente sem nome",
      date: parsed.date,
      time: parsed.time,
      weekday: parsed.weekday,
      hour: parsed.hour,
      origin: "contract",
      idMember: entry.idMember ?? null
    };
  });

  const partner = aggregators.map((item) => {
    const parsed = parseDateTime(item.checkinDate);
    const fallbackHour = item.checkinTime ? Number(item.checkinTime.split(":")[0]) : null;
    return {
      client: item.name ?? "Cliente sem nome",
      date: parsed.date,
      time: parsed.time || item.checkinTime?.slice(0, 5) || "",
      weekday: parsed.weekday,
      hour: parsed.hour ?? fallbackHour,
      origin: originFromAggregator(item.aggregator),
      idMember: item.idMember ?? null
    } satisfies UnifiedEntry;
  });

  return [...direct, ...partner].filter((entry) => entry.date);
}

export function buildDashboardPayload(
  entries: EvoEntry[],
  aggregators: EvoAggregatorCheckin[],
  sales: EvoSale[],
  window: SyncWindow
): DashboardPayload {
  const unified = unifyEntries(entries, aggregators);
  const totalEntries = unified.length;
  const uniqueClients = new Set(unified.map((entry) => entry.client)).size;
  const originCounts: Record<OriginKey, number> = {
    contract: 0,
    wellhub: 0,
    totalpass: 0,
    classpass: 0,
    other: 0
  };

  for (const entry of unified) {
    originCounts[entry.origin] += 1;
  }

  const byClient = new Map<string, UnifiedEntry[]>();
  for (const entry of unified) {
    const current = byClient.get(entry.client) ?? [];
    current.push(entry);
    byClient.set(entry.client, current);
  }

  let recurring = 0;
  let singleVisit = 0;
  let reactivated = 0;

  for (const rows of byClient.values()) {
    rows.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    if (rows.length >= 2) recurring += 1;
    if (rows.length === 1) singleVisit += 1;
    for (let index = 1; index < rows.length; index += 1) {
      const prev = new Date(rows[index - 1].date);
      const next = new Date(rows[index].date);
      const days = Math.round((next.getTime() - prev.getTime()) / 86400000);
      if (days >= 30) {
        reactivated += 1;
        break;
      }
    }
  }

  const weekday = Array.from({ length: 7 }, (_, index) => {
    const rows = unified.filter((entry) => entry.weekday === index);
    const partner = rows.filter((entry) => entry.origin !== "contract").length;
    return {
      day: WEEKDAYS_PT[index],
      entries: rows.length,
      uniqueClients: new Set(rows.map((entry) => entry.client)).size,
      aggregatorShare: rows.length ? Math.round((partner / rows.length) * 100) : 0
    };
  });

  const slotMap = new Map<string, UnifiedEntry[]>();
  for (const entry of unified) {
    const label = slotLabel(entry.hour);
    const current = slotMap.get(label) ?? [];
    current.push(entry);
    slotMap.set(label, current);
  }

  const orderedSlots = [
    "06:00 - 08:00",
    "08:00 - 12:00",
    "12:00 - 14:00",
    "14:00 - 17:00",
    "17:00 - 19:00",
    "19:00 - 21:00",
    "Outros horários",
    "Sem horário"
  ];

  const slotMix = orderedSlots
    .map((slot) => {
      const rows = slotMap.get(slot) ?? [];
      if (!rows.length) return null;
      const total = rows.length;
      const mix = {
        contract: 0,
        wellhub: 0,
        totalpass: 0,
        classpass: 0,
        other: 0
      } satisfies Record<OriginKey, number>;
      for (const row of rows) {
        mix[row.origin] += 1;
      }
      return {
        slot,
        entries: total,
        uniqueClients: new Set(rows.map((row) => row.client)).size,
        mix: {
          contract: Math.round((mix.contract / total) * 100),
          wellhub: Math.round((mix.wellhub / total) * 100),
          totalpass: Math.round((mix.totalpass / total) * 100),
          classpass: Math.round((mix.classpass / total) * 100),
          other: Math.round((mix.other / total) * 100)
        }
      };
    })
    .filter(Boolean) as DashboardPayload["slotMix"];

  const monthKey = `${window.dateStart.slice(0, 7)}`;
  const revenue = sales.reduce((sum, sale) => sum + saleValue(sale), 0);
  const contractSales = sales.filter(contractSale).length;
  const monthly = [
    {
      month: `${MONTHS_PT[Number(monthKey.slice(5, 7)) - 1]}/${monthKey.slice(2, 4)}`,
      entries: totalEntries,
      sales: sales.length
    }
  ];

  const sharePartners = totalEntries
    ? Math.round(((originCounts.wellhub + originCounts.totalpass + originCounts.classpass + originCounts.other) / totalEntries) * 100)
    : 0;
  const returnRate = uniqueClients ? Math.round((recurring / uniqueClients) * 100) : 0;
  const noReturnRate = uniqueClients ? Math.round((singleVisit / uniqueClients) * 100) : 0;
  const ticket = sales.length ? revenue / sales.length : 0;

  const strongestDay = [...weekday].sort((a, b) => b.entries - a.entries)[0];
  const strongestSlot = [...slotMix].sort((a, b) => b.entries - a.entries)[0];
  const weakestSlot = [...slotMix].sort((a, b) => a.entries - b.entries)[0];

  return {
    description:
      "Aplicação web pronta para publicar, com sincronização da EVO, banco histórico e leitura consolidada para operação, vendas e recorrência.",
    periodLabel: `${window.dateStart.split("-").reverse().join("/")} a ${window.dateEnd.split("-").reverse().join("/")}`,
    heroMix: `${100 - sharePartners}% contratos • ${sharePartners}% parceiros`,
    summaryNote:
      "Os dados ficam salvos em banco histórico. O dashboard consulta o banco e a EVO só entra na sincronização automática, não no navegador.",
    syncLabel: `Última leitura do período ${window.dateStart.split("-").reverse().join("/")} a ${window.dateEnd
      .split("-")
      .reverse()
      .join("/")}. Para produção, use cron e banco Postgres.`,
    summaryCards: [
      { label: "Entradas", value: totalEntries.toLocaleString("pt-BR"), note: "Check-ins totais processados no período" },
      { label: "Clientes únicos", value: uniqueClients.toLocaleString("pt-BR"), note: "Base ativa com pelo menos um acesso" },
      { label: "Receita", value: money(revenue), note: "Receita capturada em saleItens e receivables" },
      { label: "Contratos / créditos", value: contractSales.toLocaleString("pt-BR"), note: "Vendas classificadas como plano, contrato ou crédito" },
      { label: "Retorno", value: `${returnRate}%`, note: "Clientes com 2 ou mais entradas no período" },
      { label: "Sem retorno", value: `${noReturnRate}%`, note: "Clientes com apenas uma entrada no período" },
      { label: "Share agregadores", value: `${sharePartners}%`, note: "Peso de Wellhub, TotalPass, ClassPass e outros parceiros" },
      { label: "Ticket médio", value: money(ticket), note: "Receita total dividida pelas vendas do período" }
    ],
    weekday,
    originEntries: [
      { label: "Contratos + créditos", value: originCounts.contract, tone: "var(--heat)" },
      { label: "Wellhub", value: originCounts.wellhub, tone: "var(--teal)" },
      { label: "TotalPass", value: originCounts.totalpass, tone: "var(--violet)" },
      { label: "ClassPass", value: originCounts.classpass, tone: "var(--gold)" }
    ],
    slotMix,
    monthly,
    customerGroups: [
      { title: "Clientes recorrentes", value: recurring, note: "2 ou mais acessos no período", accent: "rgba(45, 141, 130, 0.16)" },
      { title: "Clientes sem retorno", value: singleVisit, note: "Entraram uma vez e não voltaram", accent: "rgba(237, 108, 68, 0.14)" },
      { title: "Clientes reativados", value: reactivated, note: "Voltaram após 30+ dias", accent: "rgba(124, 112, 172, 0.16)" },
      { title: "Novos clientes ativos", value: Math.max(0, recurring - reactivated), note: "Recorrentes que não entraram como reativação", accent: "rgba(215, 187, 125, 0.22)" }
    ],
    teachers: [],
    actions: [
      strongestSlot
        ? {
            title: `${strongestSlot.slot} • pico de fluxo`,
            tag: "horário forte",
            detail: `${strongestSlot.entries} entradas no período. Bom candidato para conversão comercial e reforço de capacidade.`
          }
        : {
            title: "Sincronização pronta",
            tag: "próximo passo",
            detail: "Assim que a agenda entrar, essa área vai apontar capacidade, professores e turmas sob pressão."
          },
      weakestSlot
        ? {
            title: `${weakestSlot.slot} • janela fraca`,
            tag: "atenção",
            detail: `${weakestSlot.entries} entradas no período. Vale revisar grade, campanha e oferta de entrada.`
          }
        : {
            title: "Base mínima pronta",
            tag: "dados",
            detail: "Entradas, vendas e agregadores já sustentam os comparativos principais."
          },
      {
        title: `${strongestDay?.day ?? "Sem dia"} lidera movimento`,
        tag: "dia forte",
        detail: `${strongestDay?.entries ?? 0} entradas registradas. Esse dia pode orientar campanhas e reforços de agenda.`
      }
    ],
    sources: [
      { name: "Entries", endpoint: "/api/v1/entries", usage: "Acessos, frequência, retorno, dia e horário", status: `${entries.length} linhas lidas da EVO` },
      {
        name: "Aggregator checkins",
        endpoint: "/api/v1/management/aggregators/checkins/search",
        usage: "Wellhub, TotalPass, ClassPass e parceiros",
        status: `${aggregators.length} linhas lidas da EVO`
      },
      { name: "Sales", endpoint: "/api/v2/sales", usage: "Receita, ticket, contratos e créditos", status: `${sales.length} vendas lidas da EVO` },
      { name: "Postgres", endpoint: "fact tables", usage: "Histórico e leitura do dashboard", status: "Persistência preparada na arquitetura" }
    ]
  };
}
