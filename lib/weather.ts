import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Spot } from "@/lib/spots";
import weatherAreas from "@/lib/weatherAreas.json";

export type WeatherDay = { date: string; weather: string; wind: string; wave: string };
export type WeatherArea = {
  name: string;
  office: string;
  reportDatetime: string;
  days: WeatherDay[];
  pops: { time: string; pop: string | null }[];
  hourly?: {
    time: string;
    weather: string;
    windDir: string;
    windMin: number | null;
    windMax: number | null;
    temp: number | null;
    // 風を釣り場の位置の数値予報（ECMWF）に置き換えた時の、元の気象庁の値（予報区全体の代表）
    windSrc?: "model" | "jma";
    jmaWindDir?: string;
    jmaWindMin?: number | null;
    jmaWindMax?: number | null;
  }[];
  hourlyReport?: string;
  hourlyPoint?: string;
  week?: { date: string; code: string; pop: string; tmin: string; tmax: string }[];
};

// 釣り場の府県 → 気象庁の予報区（関西の既定）。ほかの地域は釣り場の weatherArea で指定する（lib/weatherAreas.json）
const FORECAST_AREA: Partial<Record<Spot["pref"], { code: string; label: string }>> = {
  osaka: { code: "270000", label: "大阪府" },
  hyogo: { code: "280010", label: "兵庫県南部" },
  wakayama: { code: "300010", label: "和歌山県北部" },
  kyoto: { code: "260020", label: "京都府北部" },
};

const EXTRA_AREA: Record<string, string> = Object.fromEntries(
  (weatherAreas as { areas: { area: string; label: string }[] }).areas.map((a) => [a.area, a.label]),
);

const DIR16 = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
const dir16 = (deg: number) => DIR16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

type MarineWind = { run: string; points: Record<string, { ws?: (number | null)[]; wd?: (number | null)[] }> };
let marineWind: MarineWind | null | undefined;
function loadMarineWind(): MarineWind | null {
  if (marineWind !== undefined) return marineWind;
  try {
    marineWind = JSON.parse(readFileSync(join(process.cwd(), "public/data/marine.json"), "utf8")) as MarineWind;
  } catch {
    marineWind = null;
  }
  return marineWind;
}

// 気象庁の3時間ごとの風は「予報区全体の代表」で、10〜14m/s のような幅の区分。
// 釣り場の位置の数値予報（ECMWF・3時間ごと）があれば、風はそちらに置き換える（元の値は jma* に残す）。
function withSpotWind(slug: string, area: WeatherArea): WeatherArea {
  const m = loadMarineWind();
  const p = m?.points?.[slug];
  if (!m || !p?.ws || !area.hourly) return area;
  const run = Date.parse(m.run);
  return {
    ...area,
    hourly: area.hourly.map((h) => {
      const i = Math.round((Date.parse(h.time) - run) / (3 * 3600e3));
      const ws = i >= 0 ? p.ws?.[i] ?? null : null;
      const wd = i >= 0 ? p.wd?.[i] ?? null : null;
      if (ws == null || wd == null) return { ...h, windSrc: "jma" as const };
      return { ...h, windSrc: "model" as const, jmaWindDir: h.windDir, jmaWindMin: h.windMin, jmaWindMax: h.windMax, windDir: dir16(wd), windMin: null, windMax: Math.round(ws) };
    }),
  };
}

export function forecastFor(spot: Spot): { label: string; data: WeatherArea | null } {
  const fa = spot.weatherArea ? { code: spot.weatherArea, label: EXTRA_AREA[spot.weatherArea] ?? spot.weatherArea } : FORECAST_AREA[spot.pref];
  if (!fa) return { label: "", data: null };
  try {
    const json = JSON.parse(readFileSync(join(process.cwd(), "public/data/weather.json"), "utf8"));
    const area = (json.areas?.[fa.code] as WeatherArea) ?? null;
    return { label: fa.label, data: area ? withSpotWind(spot.slug, area) : null };
  } catch {
    return { label: fa.label, data: null };
  }
}
