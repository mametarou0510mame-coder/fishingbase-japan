// 釣れ方のヒント：最近の釣果の「魚種×釣り方」と、過去の同じ時期に釣れていた魚。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_DAYS, loadCatches } from "@/lib/catches";

// 施設の表記ゆれをそろえる。当てはまらないもの（「リリースあり」などのメモ）は数えない。
const METHOD_RULES: [RegExp, string][] = [
  [/サビキ/, "サビキ"],
  [/ウキ/, "ウキ釣り"],
  [/ノマセ|飲ませ|泳がせ/, "ノマセ（泳がせ）"],
  [/落し込み|落とし込み/, "落とし込み"],
  [/胴突/, "胴突き"],
  [/投げ/, "投げ釣り"],
  [/穴釣り|ブラクリ/, "穴釣り"],
  [/エギ/, "エギング"],
  [/ルアー|ジグ|ワーム/, "ルアー"],
  [/ちょい投げ/, "ちょい投げ"],
];
const normMethod = (m: string | null) => (m ? METHOD_RULES.find(([re]) => re.test(m))?.[1] ?? null : null);

export type SpeciesMethods = { species: string; total: number; methods: { name: string; count: number }[] };

export function methodsBySpecies(spotSlug: string, days = DEFAULT_DAYS): { list: SpeciesMethods[]; reports: number } {
  const data = loadCatches();
  const latest = data.reports.filter((r) => r.spot === spotSlug).map((r) => r.date).sort().at(-1);
  if (!latest) return { list: [], reports: 0 };
  const from = new Date(Date.parse(latest) - (days - 1) * 86400e3).toISOString().slice(0, 10);
  const map = new Map<string, Map<string, number>>();
  let n = 0;
  for (const r of data.reports) {
    if (r.spot !== spotSlug || r.date < from) continue;
    const m = normMethod(r.method);
    if (!m) continue;
    n++;
    const sp = r.species.replace(/（.*?）/g, "");
    if (!map.has(sp)) map.set(sp, new Map());
    const mm = map.get(sp)!;
    mm.set(m, (mm.get(m) ?? 0) + 1);
  }
  const list = [...map.entries()]
    .map(([species, mm]) => {
      const methods = [...mm.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      return { species, total: methods.reduce((a, b) => a + b.count, 0), methods };
    })
    .sort((a, b) => b.total - a.total);
  return { list, reports: n };
}

type HistoryDay = { n: number; s: Record<string, number> };
export type SeasonYear = { year: number; activeDays: number; top: { species: string; days: number }[] };

// 過去の同じ時期（前後3日、計7日間）に釣果が報告されていた魚を、年ごとに数える
export function sameSeasonHistory(spotSlug: string, date: string, years = 3): SeasonYear[] {
  let days: Record<string, HistoryDay>;
  try {
    days = JSON.parse(readFileSync(join(process.cwd(), `data/history/${spotSlug}.json`), "utf8")).days ?? {};
  } catch {
    return [];
  }
  const [y, m, d] = date.split("-").map(Number);
  const out: SeasonYear[] = [];
  for (let back = 1; back <= years; back++) {
    const center = Date.UTC(y - back, m - 1, d);
    const counts = new Map<string, number>();
    let active = 0;
    for (let off = -3; off <= 3; off++) {
      const key = new Date(center + off * 86400e3).toISOString().slice(0, 10);
      const day = days[key];
      if (!day || !day.n) continue;
      active++;
      for (const sp of Object.keys(day.s ?? {})) {
        if (sp.includes("種類不明")) continue;
        const name = sp.replace(/（.*?）/g, "");
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    if (active === 0) continue;
    const top = [...counts.entries()]
      .map(([species, n]) => ({ species, days: n }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);
    out.push({ year: y - back, activeDays: active, top });
  }
  return out;
}
