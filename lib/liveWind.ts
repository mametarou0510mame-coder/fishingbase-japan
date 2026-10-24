import stations from "@/lib/windStations.json";

// 釣り場に一番近い、海に面したアメダス（風を観測している地点）。内陸の地点は風が弱く出るので候補に入れていない
export type WindStation = { code: string; name: string; lat: number; lon: number; distKm: number };

export function nearestWindStation(lat: number, lon: number): WindStation | null {
  let best: WindStation | null = null;
  for (const s of stations as { code: string; name: string; lat: number; lon: number }[]) {
    const d = Math.hypot((s.lat - lat) * 111, (s.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180));
    if (!best || d < best.distKm) best = { ...s, distKm: Math.round(d * 10) / 10 };
  }
  return best && best.distKm <= 35 ? best : null;
}
