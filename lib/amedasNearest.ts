// 全国のアメダスから、ある地点に一番近い「風を観測している地点」を探す（ブラウザで気象庁の一覧を読む）。
// 一覧：https://www.jma.go.jp/bosai/amedas/const/amedastable.json（elems の3文字目が "1" なら風を観測）
import type { WindStation } from "@/lib/liveWind";

type Row = { type: string; elems: string; lat: [number, number]; lon: [number, number]; kjName: string };
let cache: Promise<Record<string, Row>> | null = null;

export async function nearestAmedasWind(lat: number, lon: number, maxKm = 30): Promise<WindStation | null> {
  cache ??= fetch("https://www.jma.go.jp/bosai/amedas/const/amedastable.json").then((r) => r.json());
  const table = await cache;
  let best: WindStation | null = null;
  for (const [code, r] of Object.entries(table)) {
    if (r.elems?.[2] !== "1") continue;
    const la = r.lat[0] + r.lat[1] / 60;
    const lo = r.lon[0] + r.lon[1] / 60;
    const d = Math.hypot((la - lat) * 111, (lo - lon) * 111 * Math.cos((lat * Math.PI) / 180));
    if (!best || d < best.distKm) best = { code, name: r.kjName, lat: la, lon: lo, distKm: Math.round(d * 10) / 10 };
  }
  return best && best.distKm <= maxKm ? best : null;
}
