// 潮・海況ボード（/shio/）の計算。サーバーでもブラウザでも使えるよう、ファイル読み込みはしない。
//
// 釣りどき指数（0〜100、1時間ごと）は当サイト独自の目安で、釣果を保証するものではない。
//   基本点 = 20 + 80 ×（0.6 × 潮の動き + 0.4 × まずめ）
//     潮の動き = 0.5 ×（その日の最大を1とした潮位変化の速さ）+ 0.5 ×（毎時12cm以上の変化を1とした速さ）
//     まずめ   = 日の出・日の入の前後1時間半を1、2時間半までを0.5
//   × 季節（その釣り場の過去の釣果から求めた「その日に狙える魚」の指数。0.7〜1.0）
//   × 天気（風・波・雨・雷で下げる）
//   営業時間外は0。
// 安全判定は風速（気象庁）・波の高さ（ECMWF 波浪モデル）・降水確率・雷から、釣り場の種類ごとの基準で出す。

export type TideEvent = { time: string; cm: number };
export type SpotType = "海釣り施設" | "公園の釣り場" | "沖堤防（渡船）" | "一般の釣り場" | "海上釣り堀";

export type Slot = {
  hour: number; // 0, 3, …, 21（日本時間、各コマの始まり）
  weather: string | null; // 「晴れ」「くもり」「雨」「雪」など
  temp: number | null;
  pop: number | null; // 降水確率（%）
  windDir: string | null;
  windMin: number | null; // 風速の下限（m/s）
  windMax: number | null; // 風速の上限（m/s）
  windEst: boolean; // 府県予報の文から見積もった値（時間ごとの予報がない日）
  swh: number | null; // 有義波高（m）
  mwp: number | null; // 平均周期（秒）
  mwd: number | null; // 波の来る向き（度、北=0）
  waveEst: boolean; // 府県予報の文から見積もった値
  thunder: boolean; // 時間ごとの予報に雷
  thunderText: boolean; // 府県予報の文に「雷」（所により、など）
};

export type Safety = { level: 0 | 1 | 2; reasons: string[] };

export type DayInput = {
  date: string;
  tide: (number | null)[]; // 0〜24時（24時は翌日0時）
  high: TideEvent[];
  low: TideEvent[];
  sun: { rise: number; set: number } | null;
  moonAge: number;
  tideName: string;
  open: number | null;
  close: number | null;
  species: { species: string; index: number; stage: string }[] | null;
  jma: { weather: string; wind: string; wave: string } | null;
  slots: Slot[];
  waveFar: boolean; // 波の値が釣り場から離れた沖合の格子（5km超）のもの
};

export type DayResult = DayInput & {
  hours: { h: number; index: number; open: boolean }[];
  score: number | null;
  grade: { mark: string; label: string; tone: "best" | "good" | "fair" | "poor" | "stop" };
  windows: { from: number; to: number; score: number; reasons: string[] }[];
  safety: Safety;
  slotSafety: Safety[];
  partial: boolean; // 風・波の予報がまだない日（潮と時間帯だけの指数）
};

const SHELTERED: SpotType[] = ["海釣り施設", "公園の釣り場", "海上釣り堀"];

export function safetyOf(s: Slot, type: SpotType, night: boolean, waveFar = false): Safety {
  const reasons: string[] = [];
  let level: 0 | 1 | 2 = 0;
  const up = (l: 0 | 1 | 2, why: string) => {
    if (l > level) level = l;
    reasons.push(why);
  };
  if (s.windMax !== null) {
    if (s.windMax >= 10) up(2, `風が強い（${s.windMax}m/s${s.windEst ? "の見込み" : "前後"}）`);
    else if (s.windMax >= 7) up(1, `風がやや強い（${s.windMax}m/s${s.windEst ? "の見込み" : "前後"}）`);
  }
  const sheltered = SHELTERED.includes(type);
  const [stop, care] = sheltered ? [2.0, 1.3] : [1.5, 1.0];
  if (s.swh !== null) {
    const far = waveFar && !s.waveEst ? "沖合で" : "";
    // 沖合の値しかないときは、湾内・港内では低くなることが多いので「注意」までにとどめる
    if (s.swh >= stop) up(far ? 1 : 2, `${far}波が高い（${s.swh.toFixed(1)}m）`);
    else if (s.swh >= care) up(1, `${far}波がやや高い（${s.swh.toFixed(1)}m）`);
    if (!sheltered && s.mwp !== null && s.mwp >= 9 && s.swh >= 0.8) up(1, `うねりあり（周期${Math.round(s.mwp)}秒）`);
  }
  if (s.thunder) up(2, "雷のおそれ");
  else if (s.thunderText) up(1, "所により雷の予報");
  if (s.pop !== null && s.pop >= 70) up(1, `雨の可能性が高い（${s.pop}%）`);
  if (night && (type === "一般の釣り場" || type === "沖堤防（渡船）") && level === 0) reasons.push("夜は足元・落水に注意");
  return { level, reasons };
}

function weatherMult(s: Slot | undefined, type: SpotType): number {
  if (!s) return 1;
  let m = 1;
  if (s.windMax !== null) m *= s.windMax >= 10 ? 0.3 : s.windMax >= 7 ? 0.7 : s.windMax >= 5 ? 0.9 : 1;
  if (s.swh !== null) {
    const sh = SHELTERED.includes(type);
    const [a, b, c] = sh ? [2.0, 1.3, 0.9] : [1.5, 1.0, 0.6];
    m *= s.swh >= a ? 0.3 : s.swh >= b ? 0.7 : s.swh >= c ? 0.9 : 1;
  }
  if (s.thunder) m *= 0.5;
  else if (s.thunderText) m *= 0.85;
  if (s.pop !== null) m *= s.pop >= 70 ? 0.8 : s.pop >= 50 ? 0.9 : 1;
  return m;
}

const near = (mid: number, t: number) => {
  const d = Math.abs(mid - t);
  return d <= 1.5 ? 1 : d <= 2.5 ? 0.5 : 0;
};

export function evaluateDay(d: DayInput, type: SpotType): DayResult {
  const rates = Array.from({ length: 24 }, (_, h) => {
    const a = d.tide[h];
    const b = d.tide[h + 1];
    return a == null || b == null ? 0 : Math.abs(b - a);
  });
  const maxRate = Math.max(...rates, 0.0001);
  const top = d.species?.[0]?.index ?? null;
  const season = top === null ? 0.85 : 0.7 + 0.3 * Math.min(1, top / 100);
  const hours = rates.map((r, h) => {
    const open = (d.open == null || h >= d.open) && (d.close == null || h + 1 <= d.close);
    const moving = 0.5 * (r / maxRate) + 0.5 * Math.min(1, r / 12);
    const mazume = d.sun ? Math.max(near(h + 0.5, d.sun.rise), near(h + 0.5, d.sun.set)) : 0;
    const base = 20 + 80 * (0.6 * moving + 0.4 * mazume);
    const slot = d.slots[Math.floor(h / 3)];
    const index = open ? Math.round(base * season * weatherMult(slot, d.waveFar ? "海釣り施設" : type)) : 0;
    return { h, index, open, moving, mazume };
  });

  const openHours = hours.filter((h) => h.open);
  const best3 = [...openHours].sort((a, b) => b.index - a.index).slice(0, 3);
  const score = best3.length ? Math.round(best3.reduce((a, b) => a + b.index, 0) / best3.length) : null;

  const isNight = (h: number) => (d.sun ? h + 1.5 < d.sun.rise || h + 1.5 > d.sun.set + 0.5 : false);
  const slotSafety = d.slots.map((s) => safetyOf(s, type, isNight(s.hour), d.waveFar));
  const relevant = slotSafety.filter((_, i) => openHours.some((h) => Math.floor(h.h / 3) === i));
  const lv = (relevant.length ? relevant : slotSafety).reduce<number>((a, b) => Math.max(a, b.level), 0) as 0 | 1 | 2;
  const reasons = [...new Set((relevant.length ? relevant : slotSafety).flatMap((s) => s.reasons))];
  const safety: Safety = { level: lv, reasons };

  // ねらい目：指数が高い時間のまとまり（上位2つ）
  const th = score === null ? 999 : Math.max(45, score * 0.8);
  const raw: { from: number; to: number; items: typeof hours }[] = [];
  for (const h of hours) {
    if (!h.open || h.index < th) continue;
    const last = raw[raw.length - 1];
    if (last && last.to === h.h) {
      last.to = h.h + 1;
      last.items.push(h);
    } else raw.push({ from: h.h, to: h.h + 1, items: [h] });
  }
  const windows = raw
    .map((w) => {
      const reasons: string[] = [];
      if (w.items.some((i) => i.moving >= 0.6)) reasons.push("潮がよく動く");
      if (d.sun && w.items.some((i) => near(i.h + 0.5, d.sun!.rise) === 1)) reasons.push("朝まずめ");
      if (d.sun && w.items.some((i) => near(i.h + 0.5, d.sun!.set) === 1)) reasons.push("夕まずめ");
      return { from: w.from, to: w.to, score: Math.round(w.items.reduce((a, b) => a + b.index, 0) / w.items.length), reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.from - b.from);

  let grade: DayResult["grade"];
  const stopHours = relevant.filter((s) => s.level === 2).length;
  if (relevant.length && stopHours / relevant.length >= 0.5) grade = { mark: "×", label: "見合わせ推奨", tone: "stop" };
  else if (score === null) grade = { mark: "－", label: "営業時間外", tone: "poor" };
  else if (score >= 70) grade = { mark: "◎", label: "釣りどき", tone: "best" };
  else if (score >= 52) grade = { mark: "○", label: "まずまず", tone: "good" };
  else if (score >= 35) grade = { mark: "△", label: "いまひとつ", tone: "fair" };
  else grade = { mark: "▽", label: "きびしい", tone: "poor" };

  return {
    ...d,
    hours: hours.map(({ h, index, open }) => ({ h, index, open })),
    score,
    grade,
    windows,
    safety,
    slotSafety,
    partial: d.slots.every((x) => x.windMax === null && x.swh === null),
  };
}

// ---- 気象庁の文から見積もる（時間ごとの予報がない日に使う） ----

// 「1メートル のち 1.5メートル うねりを伴う」→ 1.5
export function waveFromText(t: string | undefined | null): number | null {
  if (!t) return null;
  const nums = [...t.matchAll(/([0-9]+(?:\.[0-9]+)?)メートル/g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : null;
}

// 「海上では北東の風やや強く」→ 10。強さの言葉がなければ null（不明）
export function windFromText(t: string | undefined | null): number | null {
  if (!t) return null;
  if (t.includes("非常に強く")) return 20;
  if (t.replace(/やや強く/g, "").includes("強く")) return 15;
  if (t.includes("やや強く")) return 10;
  return null;
}

export function weatherWord(t: string | undefined | null): string | null {
  if (!t) return null;
  // 文の最初に出てくる天気（「くもり夜遅く雨」→くもり）
  const keys: [string, string][] = [["晴", "晴れ"], ["くもり", "くもり"], ["曇", "くもり"], ["雨", "雨"], ["雪", "雪"]];
  let best: [number, string] | null = null;
  for (const [k, v] of keys) {
    const i = t.indexOf(k);
    if (i >= 0 && (!best || i < best[0])) best = [i, v];
  }
  return best ? best[1] : null;
}

// 週間予報の天気コード（100番台=晴れ、200=くもり、300=雨、400=雪）
export function weatherFromCode(code: string | undefined | null): string | null {
  const c = String(code ?? "")[0];
  return c === "1" ? "晴れ" : c === "2" ? "くもり" : c === "3" ? "雨" : c === "4" ? "雪" : null;
}

export const DIR16 = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
export const dirName = (deg: number) => DIR16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
// 「北東」→ 45（風の吹いてくる向き）
export const dirDeg = (name: string | null) => {
  if (!name) return null;
  const i = DIR16.indexOf(name);
  return i < 0 ? null : i * 22.5;
};
