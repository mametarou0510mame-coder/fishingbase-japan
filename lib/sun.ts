// 日の出・日の入りの計算（NOAAの簡易式。誤差は1〜2分程度）。
// 天文計算であり気象の予報ではないため、当サイトで計算して表示してよい。

// 潮位観測地点のおおよその位置（釣り場の代表地点として使う）
export const STATION_COORDS: Record<string, { lat: number; lon: number }> = {
  AM: { lat: 34.7, lon: 135.4 }, // 尼崎
  AK: { lat: 34.64, lon: 134.99 }, // 明石
  OS: { lat: 34.65, lon: 135.43 }, // 大阪
  KB: { lat: 34.68, lon: 135.19 }, // 神戸
  TN: { lat: 34.33, lon: 135.18 }, // 淡輪
  Z9: { lat: 34.14, lon: 135.19 }, // 海南
  SI: { lat: 34.58, lon: 135.46 }, // 堺
  MZ: { lat: 35.48, lon: 135.38 }, // 舞鶴
  J5: { lat: 34.72, lon: 135.33 }, // 西宮
  J2: { lat: 34.47, lon: 135.37 }, // 岸和田
  IO: { lat: 34.51, lon: 135.4 }, // 泉大津
  KK: { lat: 34.44, lon: 135.2 }, // 関空島
  ST: { lat: 34.35, lon: 134.9 }, // 洲本
  EI: { lat: 34.47, lon: 134.83 }, // 江井（淡路島西岸）
  K1: { lat: 34.78, lon: 134.67 }, // 姫路（飾磨）
  WY: { lat: 34.22, lon: 135.15 }, // 和歌山
  H1: { lat: 34.12, lon: 135.14 }, // 下津
  GB: { lat: 33.85, lon: 135.17 }, // 御坊
  SR: { lat: 33.68, lon: 135.38 }, // 白浜
  KS: { lat: 33.47, lon: 135.78 }, // 串本
  UR: { lat: 33.57, lon: 135.9 }, // 浦神
  T2: { lat: 35.55, lon: 135.2 }, // 宮津
  T6: { lat: 35.65, lon: 134.83 }, // 津居山
};

const rad = Math.PI / 180;

// date: "YYYY-MM-DD"（日本時間の日付）。戻り値は日本時間の「時（小数）」。
export function sunTimes(date: string, lat: number, lon: number): { rise: number; set: number } | null {
  const [y, m, d] = date.split("-").map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const cosH = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) / (Math.cos(lat * rad) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null;
  const ha = Math.acos(cosH) / rad;
  const toJst = (minUtc: number) => (minUtc / 60 + 9 + 24) % 24;
  return { rise: toJst(720 - 4 * (lon + ha) - eqTime), set: toJst(720 - 4 * (lon - ha) - eqTime) };
}

export const hm = (h: number) => {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
