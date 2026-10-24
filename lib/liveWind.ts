import stations from "@/lib/windStations.json";

// 釣り場に一番近い、海に面したアメダス（風を観測している地点）。内陸の地点は風が弱く出るので候補に入れていない
export type WindStation = { code: string; name: string; lat: number; lon: number; distKm: number };

// 一番近い地点より、海の条件が似ている地点を使う釣り場（明石海峡に面した釣り場は明石）
const OVERRIDE: Record<string, string> = { "azur-maiko-shinsui-gogan": "63496" };

export function nearestWindStation(lat: number, lon: number, slug?: string): WindStation | null {
  let best: WindStation | null = null;
  for (const s of stations as { code: string; name: string; lat: number; lon: number }[]) {
    if (slug && OVERRIDE[slug] && s.code !== OVERRIDE[slug]) continue;
    const d = Math.hypot((s.lat - lat) * 111, (s.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180));
    if (!best || d < best.distKm) best = { ...s, distKm: Math.round(d * 10) / 10 };
  }
  return best && best.distKm <= 35 ? best : null;
}
