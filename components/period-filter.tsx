"use client";

import { useMemo, useState } from "react";
import type { DashboardFilters } from "@/lib/types";

type ViewMode = "month" | "quarter" | "year";

const monthLabels = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function currentYear() {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()));
}

export function PeriodFilter({ filters }: { filters: DashboardFilters }) {
  const initialView = (filters.view ?? "month") as ViewMode;
  const now = new Date();
  const defaultMonth = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(now);
  const yearNow = currentYear();
  const [view, setView] = useState<ViewMode>(initialView);
  const [month, setMonth] = useState(filters.month ?? defaultMonth);
  const [quarter, setQuarter] = useState(filters.quarter ?? `${yearNow}-Q${Math.floor((Number(defaultMonth.slice(5, 7)) - 1) / 3) + 1}`);
  const [year, setYear] = useState(filters.year ?? String(yearNow));

  const years = useMemo(() => {
    const first = 2025;
    return Array.from({ length: Math.max(1, yearNow - first + 1) }, (_, i) => String(yearNow - i));
  }, [yearNow]);

  return (
    <form className="filter-deck management-filter" action="/" method="get">
      <div className="filter-title">
        <span>Recorte</span>
        <strong>Escolha a visão</strong>
      </div>

      <label>
        <span>Visão</span>
        <select name="view" value={view} onChange={(e) => setView(e.target.value as ViewMode)}>
          <option value="month">Mês</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Ano</option>
        </select>
      </label>

      {view === "month" ? (
        <label className="period-choice">
          <span>Mês</span>
          <select name="month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {years.flatMap((y) => monthLabels.map((label, index) => {
              const value = `${y}-${String(index + 1).padStart(2, "0")}`;
              return <option key={value} value={value}>{label} {y}</option>;
            }))}
          </select>
        </label>
      ) : null}

      {view === "quarter" ? (
        <label className="period-choice">
          <span>Trimestre</span>
          <select name="quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
            {years.flatMap((y) => [1, 2, 3, 4].map((q) => (
              <option key={`${y}-Q${q}`} value={`${y}-Q${q}`}>{q}º trimestre · {y}</option>
            )))}
          </select>
        </label>
      ) : null}

      {view === "year" ? (
        <label className="period-choice">
          <span>Ano</span>
          <select name="year" value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      ) : null}

      <label className="filter-wide">
        <span>Modalidade</span>
        <select name="classType" defaultValue={filters.classType ?? "all"}>
          <option value="all">Todas as modalidades</option>
          <option value="hot-sculpt">Hot Sculpt</option>
          <option value="yoga">Yoga</option>
        </select>
      </label>

      <button type="submit">Atualizar visão</button>
    </form>
  );
}
