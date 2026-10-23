import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Spot } from "@/lib/spots";

export type WeatherDay = { date: string; weather: string; wind: string; wave: string };
export type WeatherArea = {
  name: string;
  office: string;
  reportDatetime: string;
  days: WeatherDay[];
  pops: { time: string; pop: string | null }[];
  hourly?: { time: string; weather: string; windDir: string; windMin: number | null; windMax: number | null; temp: number | null }[];
  hourlyReport?: string;
  hourlyPoint?: string;
  week?: { date: string; code: string; pop: string; tmin: string; tmax: string }[];
};

// 釣り場の府県 → 気象庁の予報区
const FORECAST_AREA: Record<Spot["pref"], { code: string; label: string }> = {
  osaka: { code: "270000", label: "大阪府" },
  hyogo: { code: "280010", label: "兵庫県南部" },
  wakayama: { code: "300010", label: "和歌山県北部" },
  kyoto: { code: "260020", label: "京都府北部" },
};

const EXTRA_AREA: Record<string, string> = { "280020": "兵庫県北部", "300020": "和歌山県南部" };

export function forecastFor(spot: Spot): { label: string; data: WeatherArea | null } {
  const fa = spot.weatherArea ? { code: spot.weatherArea, label: EXTRA_AREA[spot.weatherArea] ?? spot.weatherArea } : FORECAST_AREA[spot.pref];
  try {
    const json = JSON.parse(readFileSync(join(process.cwd(), "public/data/weather.json"), "utf8"));
    return { label: fa.label, data: (json.areas?.[fa.code] as WeatherArea) ?? null };
  } catch {
    return { label: fa.label, data: null };
  }
}
