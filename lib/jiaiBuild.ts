// ビルド時に、各釣り場の今日から3日分のねらい目時間を計算する（トップページのランキング用）。
// サイトは天気の更新（1日3回）ごとに作り直されるため、表示はそのたびに新しくなる。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { areaOfSpot } from "@/lib/areas";
import { summarize } from "@/lib/catches";
import { computeJiai, windLookup, type JiaiWindow } from "@/lib/jiai";
import { publishedSpots, spotHref } from "@/lib/spots";
import { STATION_COORDS, sunTimes } from "@/lib/sun";
import { forecastFor } from "@/lib/weather";

export type SpotJiai = {
  slug: string;
  name: string;
  href: string;
  area: string;
  recent: string[];
  recentReports: number;
  days: Record<string, { windows: JiaiWindow[]; note: string | null; maxWind: number | null }>;
};

type TideDay = { date: string; hourly: (number | null)[] };
const tideCache = new Map<string, TideDay[]>();
function tideDays(code: string, year: number): TideDay[] {
  const key = `${code}-${year}`;
  if (!tideCache.has(key)) {
    try {
      const json = JSON.parse(readFileSync(join(process.cwd(), `public/data/tides/${key}.json`), "utf8"));
      tideCache.set(key, json.days ?? []);
    } catch {
      tideCache.set(key, []);
    }
  }
  return tideCache.get(key)!;
}

export function jstDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() + 9 * 3600e3 + i * 86400e3).toISOString().slice(0, 10));
}

export function buildJiai(): { dates: string[]; spots: SpotJiai[] } {
  // 今日・明日・あさって＋この週末（土日がまだ入っていなければ足す）
  const week = jstDates(7);
  const dates = [...week.slice(0, 3), ...week.slice(3).filter((d) => [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()))];
  const spots = publishedSpots()
    .filter((s) => s.type !== "一般の釣り場" && s.type !== "海上釣り堀") // 釣り堀は潮のねらい目の対象外
    .map((spot) => {
      const coords = STATION_COORDS[spot.tideStation.code];
      const forecast = forecastFor(spot).data;
      const summary = summarize([spot.slug]).list;
      const days: SpotJiai["days"] = {};
      for (const date of dates) {
        const tide = tideDays(spot.tideStation.code, Number(date.slice(0, 4))).find((d) => d.date === date);
        if (!tide) continue;
        const m = Number(date.slice(5, 7));
        const wind = windLookup(forecast?.hourly, date);
        const r = computeJiai({
          tide: tide.hourly,
          sun: coords ? sunTimes(date, coords.lat, coords.lon) : null,
          open: spot.openHourByMonth?.[m - 1] ?? null,
          close: spot.closeHourByMonth?.[m - 1] ?? null,
          windMaxAt: wind,
        });
        const winds = r.hours.filter((h) => h.open && h.wind !== null).map((h) => h.wind as number);
        days[date] = { windows: r.windows, note: r.note, maxWind: winds.length ? Math.max(...winds) : null };
      }
      return {
        slug: spot.slug,
        name: spot.name,
        href: spotHref(spot),
        area: areaOfSpot(spot.slug)?.name ?? "",
        recent: summary.slice(0, 3).map((x) => x.species.replace(/（.*?）/g, "")),
        recentReports: summary.reduce((a, b) => a + b.reports, 0),
        days,
      };
    });
  return { dates, spots };
}
