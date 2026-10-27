// ブラウザから気象庁のデータを直接読む（気象庁のサーバーは Access-Control-Allow-Origin: * を返す。2026-10-27 確認）。
// - 推算潮位：気象庁「潮位表」テキスト（地点・年ごと）
// - 実測潮位（最近の約1か月）：気象庁「潮位観測情報」（15秒ごとの潮位と、天文潮位からのずれ＝潮位偏差）
// - 実測潮位（それより前）：気象庁「潮汐観測資料」の毎時潮位（速報値・確定値。観測基準面からの高さ）
// 実測は「推算潮位＋潮位偏差」として潮位表と同じ基準面にそろえて描く。
import type { TideDay } from "@/lib/tideCalc";
import { parseTideText } from "@/lib/tideText";

export type ObsSeries = { h: number[]; dev: number[]; source: "realtime" | "hourly" }; // h はその日0時からの時間、dev は潮位偏差(cm)
export type HourlyObs = { date: string; level: (number | null)[] }; // 潮位表基準面に直した毎時の実測潮位

const JMA_TXT = (code: string, y: number) => `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${y}/${code}.txt`;
const BOSAI = "https://www.jma.go.jp/bosai/tidelevel";

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, f: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, f().catch(() => null));
  return cache.get(key) as Promise<T>;
}

// 推算潮位（1年分）。サイト内の保存分があればそれを使い、なければ気象庁から読む
export function loadPrediction(code: string, year: number): Promise<TideDay[] | null> {
  return once(`p:${code}:${year}`, async () => {
    try {
      const r = await fetch(`/data/tides/${code}-${year}.json`);
      if (r.ok) return ((await r.json()) as { days: TideDay[] }).days;
    } catch {
      /* 気象庁から読む */
    }
    const r = await fetch(JMA_TXT(code, year));
    if (!r.ok) return null;
    const days = parseTideText(await r.text());
    return days.length > 300 ? days : null;
  });
}

// 気象庁「潮位観測情報」の地点コード（潮位表の地点記号 → 観測情報の地点）
type AreaPoint = { code: string; point: string };
let pointsPromise: Promise<AreaPoint[] | null> | null = null;
export function loadPoints(): Promise<AreaPoint[] | null> {
  if (!pointsPromise)
    pointsPromise = fetch("/data/tide-points.json")
      .then((r) => (r.ok ? (r.json() as Promise<{ points: AreaPoint[] }>) : null))
      .then((j) => j?.points ?? null)
      .catch(() => null);
  return pointsPromise;
}

const ymd = (date: string) => date.replace(/-/g, "");

// 最近（約1か月）の実測：15秒ごと → 5分ごとに間引く
export function loadRealtime(point: string, date: string): Promise<ObsSeries | null> {
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  // 今日の分は5分ごとに読み直す
  const key = `r:${point}:${date}${date === today ? `:${Math.floor(Date.now() / 300e3)}` : ""}`;
  return once(key, async () => {
    const r = await fetch(`${BOSAI}/data/tide/tide_obs_${ymd(date)}_${point}.json`, { cache: date === today ? "no-store" : "default" });
    if (!r.ok) return null;
    const j = (await r.json()) as { interval: number; departure?: (number | null)[]; tide?: (number | null)[] };
    const dep = j.departure ?? [];
    const step = Math.max(1, Math.round(300 / (j.interval || 15))); // 5分ごと
    const h: number[] = [];
    const dev: number[] = [];
    for (let i = 0; i < dep.length; i += step) {
      const v = dep[i];
      if (v == null) continue;
      h.push((i * (j.interval || 15)) / 3600);
      dev.push(v);
    }
    return h.length ? { h, dev, source: "realtime" as const } : null;
  });
}

// 「潮汐観測資料」の毎時潮位（1か月分）。観測基準面の高さ → 潮位表基準面の高さに直す
export function loadHourlyMonth(code: string, year: number, month: number, offset: number): Promise<HourlyObs[] | null> {
  const now = new Date(Date.now() + 9 * 3600e3);
  const cur = now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;
  const mm = String(month).padStart(2, "0");
  const url = cur
    ? `https://www.data.jma.go.jp/kaiyou/db/tide/sokuho/genbo.php?stn=${code}&ym=${year}${mm}&GRAPH1=on&LV=DL`
    : `https://www.data.jma.go.jp/kaiyou/db/tide/genbo/genbo.php?stn=${code}&year=${year}&month=${mm}&GRAPH1=on&LV=DL`;
  return once(`h:${code}:${year}-${mm}`, async () => {
    const r = await fetch(url);
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/(?:^|[^a-z])data=\s*\[([\s\S]*?)\]\s*;/);
    if (!m) return null;
    const vals = [...m[1].matchAll(/\[(\d+),\s*(-?[\d.]+|null)\]/g)].map((x) => (x[2] === "null" ? null : Number(x[2])));
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const out: HourlyObs[] = [];
    for (let d = 0; d < days; d++) {
      const level = vals.slice(d * 24, d * 24 + 24).map((v) => (v == null ? null : Math.round((v + offset) * 10) / 10));
      while (level.length < 24) level.push(null);
      out.push({ date: `${year}-${mm}-${String(d + 1).padStart(2, "0")}`, level });
    }
    return out;
  });
}
