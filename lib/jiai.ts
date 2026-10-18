// ねらい目時間（時合予報）。気象庁の潮位・予報と日の出・日の入を組み合わせた当サイト独自の目安で、
// 釣果を保証するものではない。気象の予報そのものは行わない（風は気象庁の予報値をそのまま使う）。
//
// 1時間ごとのスコア = 0.65 × 潮の動き（その日の最大を1とした潮位変化の速さ）
//                    + 0.35 × まずめ（日の出・日の入の前後1時間半）
// 営業時間外は対象外。風速の予想が10m以上の時間は対象外、6〜9mは0.8倍。

export type JiaiInput = {
  tide: (number | null)[]; // 0〜23時の潮位
  sun: { rise: number; set: number } | null;
  open?: number | null; // 開園（時）
  close?: number | null; // 閉園（時）
  windMaxAt?: (hour: number) => number | null; // その時刻の風速予想の上限（m/s）
};

export type HourScore = { h: number; score: number; moving: number; mazume: number; open: boolean; wind: number | null };
export type JiaiWindow = { from: number; to: number; score: number; grade: "◎" | "○" | "△"; reasons: string[] };
export type JiaiResult = { hours: HourScore[]; windows: JiaiWindow[]; note: string | null };

export function computeJiai(input: JiaiInput): JiaiResult {
  const { tide, sun } = input;
  const rates = tide.map((v, h) => {
    const a = h < 23 ? v : tide[22];
    const b = h < 23 ? tide[h + 1] : v;
    return a === null || b === null ? 0 : Math.abs((b as number) - (a as number));
  });
  const maxRate = Math.max(...rates, 0);
  const smallTide = maxRate < 3;
  const near = (mid: number, t: number) => {
    const d = Math.abs(mid - t);
    return d <= 1.5 ? 1 : d <= 2.5 ? 0.5 : 0;
  };
  const hours: HourScore[] = tide.map((_, h) => {
    const moving = smallTide ? 0 : rates[h] / maxRate;
    const mid = h + 0.5;
    const mazume = sun ? Math.max(near(mid, sun.rise), near(mid, sun.set)) : 0;
    const open =
      (input.open == null || h >= input.open) && (input.close == null || h + 1 <= input.close);
    const wind = input.windMaxAt ? input.windMaxAt(h) : null;
    let score = 0.65 * moving + 0.35 * mazume;
    if (!open || (wind !== null && wind >= 10)) score = 0;
    else if (wind !== null && wind >= 6) score *= 0.8;
    return { h, score, moving, mazume, open, wind };
  });

  // スコア0.55以上が続く時間をまとめる
  const raw: { from: number; to: number; items: HourScore[] }[] = [];
  for (const s of hours) {
    if (s.score < 0.55) continue;
    const last = raw[raw.length - 1];
    if (last && last.to === s.h) {
      last.to = s.h + 1;
      last.items.push(s);
    } else raw.push({ from: s.h, to: s.h + 1, items: [s] });
  }
  const windows = raw
    .map((w) => {
      const avg = w.items.reduce((a, b) => a + b.score, 0) / w.items.length;
      const reasons: string[] = [];
      if (w.items.some((i) => i.moving >= 0.6)) reasons.push("潮が動く");
      if (sun && w.items.some((i) => near(i.h + 0.5, sun.rise) === 1)) reasons.push("朝まずめ");
      if (sun && w.items.some((i) => near(i.h + 0.5, sun.set) === 1)) reasons.push("夕まずめ");
      if (w.items.some((i) => i.wind !== null && i.wind >= 6)) reasons.push("やや風あり");
      const grade: JiaiWindow["grade"] = avg >= 0.72 ? "◎" : avg >= 0.6 ? "○" : "△";
      return { from: w.from, to: w.to, score: Math.round(avg * 100) / 100, grade, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.from - b.from);

  let note: string | null = null;
  if (smallTide) note = "一日を通して潮の動きが小さい日です";
  else if (hours.every((h) => !h.open || (h.wind !== null && h.wind >= 10)))
    note = "営業時間中は風が強い予報です";
  else if (windows.length === 0) note = "営業時間内に目立つねらい目はありません";
  return { hours, windows, note };
}

export const windowLabel = (w: JiaiWindow) => `${w.from}時〜${w.to}時`;

// 3時間ごとの予報から、その時刻の風速上限を返す関数を作る
export function windLookup(
  slots: { time: string; windMax: number | null }[] | undefined,
  date: string,
): ((h: number) => number | null) | undefined {
  if (!slots?.length) return undefined;
  const map = new Map<number, number | null>();
  for (const s of slots) {
    const t = new Date(new Date(s.time).getTime() + 9 * 3600 * 1000);
    if (t.toISOString().slice(0, 10) !== date) continue;
    const h0 = t.getUTCHours();
    for (let h = h0; h < h0 + 3; h++) map.set(h, s.windMax);
  }
  if (map.size === 0) return undefined;
  return (h) => (map.has(h) ? (map.get(h) as number | null) : null);
}
