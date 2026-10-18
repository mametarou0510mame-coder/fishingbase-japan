import { readFileSync } from "node:fs";
import { join } from "node:path";

export type IndexEntry = { species: string; index: number; stage: "最盛期" | "シーズン中" | "シーズン外" };
export type SpotIndex = {
  coverage: { from: string; to: string; activeDays: number };
  days: { date: string; tideClass: "大" | "中" | "小" | null; top: IndexEntry[] }[];
  species: Record<string, { reports: number; bestWeeks: number[]; tideLift: Record<string, number> }>;
};

let cache: { generatedOn: string | null; spots: Record<string, SpotIndex> } | null = null;

export function indexFor(spotSlug: string): { generatedOn: string | null; data: SpotIndex | null } {
  if (!cache) {
    try {
      cache = JSON.parse(readFileSync(join(process.cwd(), "public/data/index.json"), "utf8"));
    } catch {
      cache = { generatedOn: null, spots: {} };
    }
  }
  return { generatedOn: cache!.generatedOn, data: cache!.spots[spotSlug] ?? null };
}

// 週番号（0〜51）を「◯月上旬」などに
export function weekLabel(w: number) {
  const d = new Date(Date.UTC(2026, 0, 1 + w * 7 + 3));
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${m}月${day <= 10 ? "上旬" : day <= 20 ? "中旬" : "下旬"}`;
}
