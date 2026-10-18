import { readFileSync } from "node:fs";
import { join } from "node:path";

// 施設公式の釣果情報（scripts/fetch-catches.mjs が毎日更新）をビルド時に読み込み、集計する。
export type CatchReport = {
  spot: string;
  id: string;
  date: string;
  species: string;
  sizeCm: number | null;
  count: number | null;
  method: string | null;
  time: string | null;
  url: string;
};

export type MonthlyRow = {
  species: string;
  stars: number;
  size: string;
  perPerson: string;
  method: string;
  bait: string;
};

type CatchData = {
  updatedOn: string | null;
  sources: { spot: string; name: string; url: string; lastSuccess: string | null }[];
  monthly: Record<string, { month: string; url: string; rows: MonthlyRow[] }>;
  reports: CatchReport[];
};

let cache: CatchData | null = null;
export function loadCatches(): CatchData {
  if (cache) return cache;
  try {
    cache = JSON.parse(readFileSync(join(process.cwd(), "public/data/catches.json"), "utf8")) as CatchData;
  } catch {
    cache = { updatedOn: null, sources: [], monthly: {}, reports: [] };
  }
  return cache;
}

export const DEFAULT_DAYS = 14;

export type SpeciesSummary = {
  species: string;
  reports: number; // 報告の件数
  days: number; // 報告があった日数
  maxSizeCm: number | null;
  lastDate: string;
  spots: string[];
};

function sinceDate(days: number, base: string | null): string {
  const b = base ? new Date(`${base}T00:00:00Z`) : new Date(Date.now() + 9 * 3600 * 1000);
  return new Date(b.getTime() - (days - 1) * 86400 * 1000).toISOString().slice(0, 10);
}

export function summarize(spotSlugs: string[], days = DEFAULT_DAYS): { from: string; to: string | null; list: SpeciesSummary[] } {
  const data = loadCatches();
  const from = sinceDate(days, data.updatedOn);
  const map = new Map<string, SpeciesSummary & { dates: Set<string> }>();
  for (const r of data.reports) {
    if (!spotSlugs.includes(r.spot) || r.date < from) continue;
    const s: SpeciesSummary & { dates: Set<string> } =
      map.get(r.species) ??
      { species: r.species, reports: 0, days: 0, maxSizeCm: null, lastDate: r.date, spots: [], dates: new Set<string>() };
    s.reports += 1;
    s.dates.add(r.date);
    if (r.sizeCm !== null && (s.maxSizeCm === null || r.sizeCm > s.maxSizeCm)) s.maxSizeCm = r.sizeCm;
    if (r.date > s.lastDate) s.lastDate = r.date;
    if (!s.spots.includes(r.spot)) s.spots.push(r.spot);
    map.set(r.species, s);
  }
  const list = [...map.values()]
    .map(({ dates, ...s }) => ({ ...s, days: dates.size }))
    .sort((a, b) => b.days - a.days || b.reports - a.reports || (a.lastDate < b.lastDate ? 1 : -1));
  return { from, to: data.updatedOn, list };
}

export function hasCatchSource(spotSlug: string) {
  return loadCatches().sources.some((s) => s.spot === spotSlug);
}

export function sourceOf(spotSlug: string) {
  return loadCatches().sources.find((s) => s.spot === spotSlug) ?? null;
}

export function monthlyOf(spotSlug: string) {
  return loadCatches().monthly[spotSlug] ?? null;
}

export function recentReports(spotSlug: string, limit = 8) {
  return loadCatches()
    .reports.filter((r) => r.spot === spotSlug)
    .slice(0, limit);
}
