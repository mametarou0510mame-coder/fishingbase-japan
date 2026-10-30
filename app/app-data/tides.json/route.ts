import { TIDE_STATIONS, obsOffset } from "@/lib/tideStations";

// アプリの地図に出す、全国の潮位ポイント（気象庁 潮位表の約240地点）
export const dynamic = "force-static";

export function GET() {
  const list = TIDE_STATIONS.map((s) => ({ code: s.code, name: s.name, pref: s.pref ?? "", lat: s.lat!, lon: s.lon!, obsOffset: obsOffset(s) }));
  return Response.json({ points: list });
}
