// 気象庁「潮位表」テキスト（固定長136桁/行）の解析。scripts/tide-parser.mjs と同じ書式（ブラウザ用）。
// 書式: https://www.data.jma.go.jp/kaiyou/db/tide/suisan/readme.html
import type { TideDay, TideEvent } from "@/lib/tideCalc";

const num = (s: string) => {
  const n = parseInt(s.trim(), 10);
  return Number.isNaN(n) ? null : n;
};

function events(chunk: string): TideEvent[] {
  const out: TideEvent[] = [];
  for (let k = 0; k < 4; k++) {
    const part = chunk.slice(k * 7, k * 7 + 7);
    const t = part.slice(0, 4);
    if (t.trim() === "9999") continue;
    const hh = num(t.slice(0, 2));
    const mm = num(t.slice(2, 4));
    const cm = num(part.slice(4, 7));
    if (hh === null || mm === null || cm === null) continue;
    out.push({ time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, cm });
  }
  return out;
}

export function parseTideText(text: string): TideDay[] {
  const out: TideDay[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.length < 136) continue;
    const hourly: (number | null)[] = [];
    for (let i = 0; i < 24; i++) hourly.push(num(line.slice(i * 3, i * 3 + 3)));
    const yy = num(line.slice(72, 74));
    const mo = num(line.slice(74, 76));
    const dd = num(line.slice(76, 78));
    if (yy === null || mo === null || dd === null) continue;
    out.push({
      date: `20${String(yy).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
      hourly,
      high: events(line.slice(80, 108)),
      low: events(line.slice(108, 136)),
    });
  }
  return out;
}
