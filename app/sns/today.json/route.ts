// 自動投稿（scripts/sns）が使う、その日のねらい目と最新の釣果のまとめ。ビルドのたびに作り直す。
import { loadCatches } from "@/lib/catches";
import { buildJiai } from "@/lib/jiaiBuild";
import { moonInfo } from "@/lib/moon";
import { SITE } from "@/lib/site";
import { publishedSpots } from "@/lib/spots";

export const dynamic = "force-static";

export function GET() {
  const jiai = buildJiai();
  const catches = loadCatches();
  const names = new Map(publishedSpots().map((s) => [s.slug, s.name]));
  // 直近の日付ごとに、施設が発表した釣果（サイズの大きい順・数の多い順）
  const byDay: Record<string, { spot: string; name: string; species: string; sizeCm: number | null; count: number | null; source: string }[]> = {};
  const srcName = (spot: string) => catches.sources.find((s) => s.spot === spot)?.name ?? "";
  for (const r of catches.reports) {
    if (String(r.id).startsWith("user-")) continue;
    (byDay[r.date] ??= []).push({
      spot: r.spot,
      name: names.get(r.spot) ?? r.spot,
      species: r.species,
      sizeCm: r.sizeCm,
      count: r.count,
      source: srcName(r.spot),
    });
  }
  const recentDays = Object.keys(byDay).sort().reverse().slice(0, 3);
  return Response.json({
    site: SITE.url,
    generatedAt: new Date().toISOString(),
    dates: jiai.dates.map((d) => ({ date: d, ...moonInfo(d) })),
    spots: jiai.spots,
    catches: Object.fromEntries(recentDays.map((d) => [d, byDay[d]])),
  });
}
