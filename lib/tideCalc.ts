// 潮汐の計算（ブラウザとビルドの両方で使う純粋な関数）。
// 潮位表の値は気象庁「潮位表」の推算潮位（潮位表基準面からの高さ cm）。

export type TideEvent = { time: string; cm: number };
export type TideDay = { date: string; hourly: (number | null)[]; high: TideEvent[]; low: TideEvent[] };

export const addDays = (date: string, n: number) => new Date(Date.parse(date + "T00:00:00Z") + n * 86400e3).toISOString().slice(0, 10);
export const jstNow = () => new Date(Date.now() + 9 * 3600e3);
export const jstToday = () => jstNow().toISOString().slice(0, 10);
export const jstHour = () => {
  const d = jstNow();
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
};
const toH = (t: string) => {
  const [a, b] = t.split(":").map(Number);
  return a + b / 60;
};

export type Extreme = { kind: "high" | "low"; at: number; cm: number; time: string; date: string }; // at: 基準日0時からの時間

// 基準日 base の前後の満潮・干潮を時刻順に並べる
export function extremesAround(days: Map<string, TideDay>, base: string, from = -1, to = 1): Extreme[] {
  const out: Extreme[] = [];
  for (let n = from; n <= to; n++) {
    const date = addDays(base, n);
    const d = days.get(date);
    if (!d) continue;
    for (const e of d.high) out.push({ kind: "high", at: n * 24 + toH(e.time), cm: e.cm, time: e.time, date });
    for (const e of d.low) out.push({ kind: "low", at: n * 24 + toH(e.time), cm: e.cm, time: e.time, date });
  }
  return out.sort((a, b) => a.at - b.at);
}

// 推算潮位（基準日0時からの時間 h の潮位）。前後の満干のあいだは余弦で補い、なければ毎時の値を直線でつなぐ
export function predictedAt(days: Map<string, TideDay>, base: string, h: number, ex?: Extreme[]): number | null {
  const list = ex ?? extremesAround(days, base);
  const prev = [...list].reverse().find((e) => e.at <= h);
  const next = list.find((e) => e.at > h);
  if (prev && next && next.at - prev.at < 9) {
    const f = (h - prev.at) / (next.at - prev.at);
    return prev.cm + (next.cm - prev.cm) * (1 - Math.cos(Math.PI * f)) / 2;
  }
  const dayOff = Math.floor(h / 24);
  const d = days.get(addDays(base, dayOff));
  if (!d) return null;
  const hh = h - dayOff * 24;
  const i = Math.floor(hh);
  const a = d.hourly[i];
  const b = i + 1 < 24 ? d.hourly[i + 1] : days.get(addDays(base, dayOff + 1))?.hourly[0] ?? null;
  if (a == null) return null;
  if (b == null) return a;
  return a + (b - a) * (hh - i);
}

export type TideStage = {
  dir: "up" | "down"; // 上げ潮・下げ潮
  part: number; // 何分（1〜9）。0 は満干の直後、10 は満干の直前
  label: string; // 例「上げ4分」「満潮（潮止まり）」
  progress: number; // 0〜1（前の満干から次の満干まで）
  prev: Extreme;
  next: Extreme;
};

// いまの潮の状態。前の満干から次の満干までを10等分して「上げ○分」「下げ○分」で表す（一般的な釣りの言い方）
export function stageAt(days: Map<string, TideDay>, base: string, h: number): TideStage | null {
  const ex = extremesAround(days, base);
  const prev = [...ex].reverse().find((e) => e.at <= h);
  const next = ex.find((e) => e.at > h);
  if (!prev || !next) return null;
  const progress = Math.min(1, Math.max(0, (h - prev.at) / (next.at - prev.at)));
  const dir = prev.kind === "low" ? "up" : "down";
  const part = Math.min(10, Math.floor(progress * 10));
  const near = Math.min(h - prev.at, next.at - h) <= 0.34; // 満干の前後20分は潮止まり
  let label: string;
  if (near) {
    const e = h - prev.at <= next.at - h ? prev : next;
    label = `${e.kind === "high" ? "満潮" : "干潮"}（潮止まり）`;
  } else {
    label = `${dir === "up" ? "上げ" : "下げ"}${Math.max(1, Math.min(9, part))}分`;
  }
  return { dir, part, label, progress, prev, next };
}

// 1時間あたりの潮位の変化（cm/時）
export function rateAt(days: Map<string, TideDay>, base: string, h: number): number | null {
  const a = predictedAt(days, base, h - 0.25);
  const b = predictedAt(days, base, h + 0.25);
  return a == null || b == null ? null : (b - a) * 2;
}

export const fmtDur = (hours: number) => {
  const m = Math.max(0, Math.round(hours * 60));
  return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ""}` : `${m}分`;
};
export const fmtHm = (h: number) => {
  const m = Math.round(((h % 24) + 24) % 24 * 60);
  return `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, "0")}`;
};
