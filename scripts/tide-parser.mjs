// 気象庁「潮位表」テキスト（固定長136桁/行）を解析する。
// 書式: https://www.data.jma.go.jp/kaiyou/db/tide/suisan/readme.html
//  1-72   毎時潮位 3桁×24（cm）
//  73-78  年月日 2桁×3
//  79-80  地点記号
//  81-108 満潮 時刻4桁+潮位3桁 ×4（予測なし: 9999 / 999）
//  109-136 干潮 同上

function num(s) {
  const n = parseInt(s.trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function events(chunk) {
  const out = [];
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

export function parseLine(line) {
  if (line.length < 136) return null;
  const hourly = [];
  for (let i = 0; i < 24; i++) hourly.push(num(line.slice(i * 3, i * 3 + 3)));
  const yy = num(line.slice(72, 74));
  const mo = num(line.slice(74, 76));
  const dd = num(line.slice(76, 78));
  if (yy === null || mo === null || dd === null) return null;
  return {
    date: `20${String(yy).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
    station: line.slice(78, 80),
    hourly,
    high: events(line.slice(80, 108)),
    low: events(line.slice(108, 136)),
  };
}

export function parseFile(text) {
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .map(parseLine)
    .filter(Boolean);
}
