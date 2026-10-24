// 潮・海況ボードのデータをビルド時に組み立てる（気象庁の潮位表・天気予報、ECMWF の波浪予報、釣果の指数）。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { indexFor } from "@/lib/fishingIndex";
import { moonInfo } from "@/lib/moon";
import { dirName, evaluateDay, waveFromText, weatherFromCode, weatherWord, windFromText, type DayInput, type DayResult, type Slot, type SpotType } from "@/lib/shio";
import type { Spot } from "@/lib/spots";
import { STATION_COORDS, sunTimes } from "@/lib/sun";
import { forecastFor, type WeatherArea } from "@/lib/weather";
import coords from "@/lib/spotCoords.json";

type TideDay = { date: string; hourly: (number | null)[]; high: { time: string; cm: number }[]; low: { time: string; cm: number }[] };
export type MarinePoint = { lat: number; lon: number; distKm: number; swh: (number | null)[]; mwd: (number | null)[]; mwp: (number | null)[]; ws?: (number | null)[]; wd?: (number | null)[] };
type Marine = { fetchedAt: string; source: string; sourceUrl: string; resolution: string; run: string; stepHours: number; points: Record<string, MarinePoint> };

const tideCache = new Map<string, Map<string, TideDay>>();
function tideDays(code: string): Map<string, TideDay> {
  if (tideCache.has(code)) return tideCache.get(code)!;
  const map = new Map<string, TideDay>();
  for (const y of [2025, 2026, 2027, 2028]) {
    try {
      const json = JSON.parse(readFileSync(join(process.cwd(), `public/data/tides/${code}-${y}.json`), "utf8"));
      for (const d of json.days as TideDay[]) map.set(d.date, d);
    } catch {
      /* その年のファイルがない */
    }
  }
  tideCache.set(code, map);
  return map;
}

let marineCache: Marine | null | undefined;
export function loadMarine(): Marine | null {
  if (marineCache !== undefined) return marineCache;
  try {
    marineCache = JSON.parse(readFileSync(join(process.cwd(), "public/data/marine.json"), "utf8"));
  } catch {
    marineCache = null;
  }
  return marineCache!;
}

const jstNow = () => new Date(Date.now() + 9 * 3600e3);
export const addDays = (date: string, n: number) => new Date(Date.parse(date + "T00:00:00Z") + n * 86400e3).toISOString().slice(0, 10);
const jstParts = (iso: string) => {
  const t = new Date(new Date(iso).getTime() + 9 * 3600e3);
  return { date: t.toISOString().slice(0, 10), hour: t.getUTCHours() };
};

export function spotLatLon(spot: Spot): { lat: number; lon: number } {
  const c = (coords as Record<string, { lat: number; lon: number }>)[spot.slug];
  if (c) return { lat: c.lat, lon: c.lon };
  return STATION_COORDS[spot.tideStation.code] ?? { lat: 34.6, lon: 135.2 };
}

function buildSlots(date: string, w: WeatherArea | null, marine: MarinePoint | null, run: string | null): Slot[] {
  const daily = w?.days.find((d) => d.date === date) ?? null;
  const week = w?.week?.find((d) => d.date === date) ?? null;
  return Array.from({ length: 8 }, (_, k) => {
    const hour = k * 3;
    const hourly = w?.hourly?.find((h) => {
      const p = jstParts(h.time);
      return p.date === date && p.hour === hour;
    });
    const popRow = w?.pops.find((p) => {
      const q = jstParts(p.time);
      return q.date === date && q.hour <= hour && hour < q.hour + 6;
    });
    let pop: number | null = popRow && popRow.pop !== null && popRow.pop !== "" ? Number(popRow.pop) : null;
    if (pop === null && week?.pop) pop = Number(week.pop);

    let swh: number | null = null;
    let mwp: number | null = null;
    let mwd: number | null = null;
    let ws: number | null = null;
    let wd: number | null = null;
    let waveEst = false;
    if (marine && run) {
      const t = Date.parse(date + "T00:00:00+09:00") + hour * 3600e3;
      const i = Math.round((t - Date.parse(run)) / (3 * 3600e3));
      if (i >= 0 && i < marine.swh.length) {
        swh = marine.swh[i];
        mwp = marine.mwp[i];
        mwd = marine.mwd[i];
        ws = marine.ws?.[i] ?? null;
        wd = marine.wd?.[i] ?? null;
      }
    }
    if (swh === null && daily) {
      swh = waveFromText(daily.wave);
      waveEst = swh !== null;
    }
    // 風：釣り場の位置の数値予報（ECMWF。forecastFor で気象庁の3時間予報にも反映済み）→ なければ気象庁の3時間予報 → 府県予報の文
    let windMax = hourly?.windMax ?? null;
    let windDir = hourly?.windDir ?? null;
    let windEst = false;
    if (!hourly) {
      if (ws !== null) {
        windMax = Math.round(ws);
        windDir = wd === null ? null : dirName(wd);
      } else {
        windMax = windFromText(daily?.wind);
        windEst = windMax !== null;
      }
    }
    return {
      hour,
      weather: hourly ? weatherWord(hourly.weather) ?? hourly.weather : weatherWord(daily?.weather) ?? weatherFromCode(week?.code),
      temp: hourly?.temp ?? null,
      pop,
      windDir,
      windMin: hourly?.windMin ?? null,
      windMax,
      windEst,
      swh,
      mwp,
      mwd,
      waveEst,
      thunder: !!hourly?.weather?.includes("雷"),
      thunderText: !hourly && !!daily?.weather?.includes("雷"),
    };
  });
}

export type Board = {
  today: string;
  days: DayResult[];
  station: { code: string; name: string };
  weatherLabel: string;
  weatherReport: string | null;
  marine: { source: string; sourceUrl: string; resolution: string; run: string; distKm: number } | null;
  indexOn: string | null;
};

// 前日から7日先まで（9日分）。ブラウザ側で「今日」に合わせて表示を始める
export function buildBoard(spot: Spot): Board {
  const today = jstNow().toISOString().slice(0, 10);
  const tides = tideDays(spot.tideStation.code);
  const { lat, lon } = spotLatLon(spot);
  const { label, data: weather } = forecastFor(spot);
  const m = loadMarine();
  const mp = m?.points[spot.slug] ?? null;
  const idx = indexFor(spot.slug);
  const days: DayResult[] = [];
  for (let n = -1; n <= 7; n++) {
    const date = addDays(today, n);
    const t = tides.get(date);
    if (!t) continue;
    const next = tides.get(addDays(date, 1));
    const month = Number(date.slice(5, 7)) - 1;
    const moon = moonInfo(date);
    const input: DayInput = {
      date,
      tide: [...t.hourly, next?.hourly[0] ?? t.hourly[23]],
      high: t.high,
      low: t.low,
      sun: sunTimes(date, lat, lon),
      moonAge: moon.age,
      tideName: moon.tideName,
      open: spot.openHourByMonth?.[month] ?? null,
      close: spot.closeHourByMonth?.[month] ?? null,
      species: idx.data?.days.find((d) => d.date === date)?.top ?? null,
      jma: weather?.days.find((d) => d.date === date) ?? null,
      slots: buildSlots(date, weather, mp, m?.run ?? null),
      waveFar: (mp?.distKm ?? 0) > 5,
    };
    days.push(evaluateDay(input, spot.type as SpotType));
  }
  return {
    today,
    days,
    station: spot.tideStation,
    weatherLabel: label,
    weatherReport: weather?.reportDatetime ?? null,
    marine: mp && m ? { source: m.source, sourceUrl: m.sourceUrl, resolution: m.resolution, run: m.run, distKm: mp.distKm } : null,
    indexOn: idx.generatedOn,
  };
}
