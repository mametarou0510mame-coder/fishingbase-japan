// 全国の潮位表の地点（気象庁「潮位表」約240地点）。scripts/fetch-tide-stations.mjs で作る。
import data from "@/lib/tideStations.json";

export type TideStation = {
  code: string;
  name: string;
  pref: string | null;
  lat: number | null;
  lon: number | null;
  tableDatum: number | null; // 潮位表基準面の標高（cm）
  obs: { datum: number } | null; // 気象庁の潮位観測地点なら観測基準面の標高（cm）
};

export const TIDE_STATIONS = (data as { stations: TideStation[] }).stations.filter((s) => s.lat != null && s.lon != null);

export const REGIONS: { name: string; prefs: string[] }[] = [
  { name: "北海道", prefs: ["北海道"] },
  { name: "東北", prefs: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { name: "関東", prefs: ["茨城県", "千葉県", "東京都", "神奈川県"] },
  { name: "中部・北陸", prefs: ["新潟県", "富山県", "石川県", "福井県", "静岡県", "愛知県"] },
  { name: "近畿", prefs: ["三重県", "京都府", "大阪府", "兵庫県", "和歌山県"] },
  { name: "中国", prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
  { name: "四国", prefs: ["徳島県", "香川県", "愛媛県", "高知県"] },
  { name: "九州・沖縄", prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
];

export const stationByCode = (code: string) => TIDE_STATIONS.find((s) => s.code === code);

// 観測基準面 → 潮位表基準面 の換算（cm）。両方の標高がわかる地点だけ
export const obsOffset = (s: TideStation) => (s.obs && s.tableDatum != null ? Math.round((s.obs.datum - s.tableDatum) * 10) / 10 : null);

export const stationSlug = (code: string) => code.toLowerCase();
export const codeFromSlug = (slug: string) => TIDE_STATIONS.find((s) => stationSlug(s.code) === slug)?.code;

export function nearestStation(lat: number, lon: number, list = TIDE_STATIONS) {
  let best: TideStation | null = null;
  let bd = Infinity;
  for (const s of list) {
    const d = Math.hypot((s.lat! - lat) * 111, (s.lon! - lon) * 111 * Math.cos((lat * Math.PI) / 180));
    if (d < bd) [best, bd] = [s, d];
  }
  return best ? { station: best, km: Math.round(bd * 10) / 10 } : null;
}
