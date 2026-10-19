// 釣り方ガイド（content/guides/*.json）。動画（public/videos/<slug>.mp4）は guide-videos ワークフローが作る。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCatches } from "@/lib/catches";
import { allowed, type GearTag } from "@/lib/gear";
import { publishedSpots, type Spot } from "@/lib/spots";

export type TackleItem = { name: string; spec: string; keyword: string };
export type TackleTier = { tier: string; who: string; budget: string; items: TackleItem[] };
export type Guide = {
  slug: string;
  no: number;
  title: string;
  sub: string;
  category: string;
  level: string;
  targets: string[];
  catchRegex: string;
  season: string;
  gearTags: GearTag[];
  summary: string;
  steps: { title: string; body: string }[];
  patterns: { title: string; rows: { when: string; do: string; why: string }[]; note?: string };
  hookTable?: { title: string; rows: { size: string; fish: string }[]; note?: string };
  places: { text: string; points: string[] };
  tackle: TackleTier[];
  safety: string[];
};
export type PlanItem = { no: number; slug: string; title: string; category: string };

const DIR = join(process.cwd(), "content/guides");

let cache: Guide[] | null = null;
export function guides(): Guide[] {
  if (cache) return cache;
  cache = readdirSync(DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as Guide)
    .sort((a, b) => a.no - b.no);
  return cache;
}

export const findGuide = (slug: string) => guides().find((g) => g.slug === slug);

export function guidePlan(): PlanItem[] {
  return JSON.parse(readFileSync(join(DIR, "_plan.json"), "utf8")) as PlanItem[];
}

export function guideVideo(slug: string): { src: string; poster: string | null } | null {
  const pub = join(process.cwd(), "public/videos");
  if (!existsSync(join(pub, `${slug}.mp4`))) return null;
  return { src: `/videos/${slug}.mp4`, poster: existsSync(join(pub, `${slug}.jpg`)) ? `/videos/${slug}.jpg` : null };
}

// この釣り方ができる（ルールで禁止が確認されていない）釣り場
export function spotsForGuide(g: Guide): Spot[] {
  return publishedSpots().filter((s) => allowed(g.gearTags, s.restrictions));
}

// 最近（最新の釣果日から14日）、対象魚の釣果があった釣り場
export function recentSpotsForGuide(g: Guide, days = 14): { spot: Spot; reports: number; latest: string }[] {
  const data = loadCatches();
  const re = new RegExp(g.catchRegex);
  const ok = new Map(spotsForGuide(g).map((s) => [s.slug, s]));
  const latestAll = data.reports.map((r) => r.date).sort().at(-1);
  if (!latestAll) return [];
  const from = new Date(Date.parse(latestAll) - (days - 1) * 86400e3).toISOString().slice(0, 10);
  const map = new Map<string, { reports: number; latest: string }>();
  for (const r of data.reports) {
    if (r.date < from || !ok.has(r.spot) || r.id.startsWith("user-") || !re.test(r.species)) continue;
    const m = map.get(r.spot) ?? { reports: 0, latest: r.date };
    m.reports++;
    if (r.date > m.latest) m.latest = r.date;
    map.set(r.spot, m);
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ spot: ok.get(slug)!, ...v }))
    .sort((a, b) => b.reports - a.reports);
}
