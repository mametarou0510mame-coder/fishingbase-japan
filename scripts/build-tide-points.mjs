// 気象庁「潮位観測情報」（https://www.jma.go.jp/bosai/tidelevel/）の観測地点を、潮位表の地点（lib/tideStations.json）に対応づけて
// public/data/tide-points.json に保存する。ブラウザはこれを使って、いまの実測潮位（15秒ごと）を読む。
// 対応づけ：同じ名前、または潮位表の地点から3km以内の観測地点（気象庁の地点を優先）。
// ローカルの保存分から作るとき：node scripts/build-tide-points.mjs <tide_area.json>
import { readFile, writeFile } from "node:fs/promises";

const src = process.argv[2];
const area = JSON.parse(
  src
    ? await readFile(src, "utf8")
    : await (await fetch("https://www.jma.go.jp/bosai/tidelevel/const/tide_area.json", { headers: { "User-Agent": "Tsuredoki/0.2" } })).text(),
);
const { stations } = JSON.parse(await readFile(new URL("../lib/tideStations.json", import.meta.url), "utf8"));

const obs = [];
for (const v of Object.values(area)) for (const c of v.class30s ?? []) for (const s of c.stations ?? []) obs.push(s);

const km = (a, b) => {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

const points = [];
for (const s of stations) {
  if (s.lat == null) continue;
  const cands = obs
    .map((o) => ({ o, d: km(s, o), same: o.name === s.name }))
    .filter((c) => c.same ? c.d < 15 : c.d < 3)
    .sort((a, b) => Number(b.same) - Number(a.same) || Number(b.o.type === "jma") - Number(a.o.type === "jma") || a.d - b.d);
  const best = cands[0];
  if (!best) continue;
  points.push({ code: s.code, point: best.o.code, name: best.o.name, by: best.o.typeName ?? best.o.type, km: Math.round(best.d * 10) / 10 });
}

await writeFile(
  new URL("../public/data/tide-points.json", import.meta.url),
  JSON.stringify({ note: "潮位表の地点 → 気象庁「潮位観測情報」の観測地点", source: "https://www.jma.go.jp/bosai/tidelevel/", points }) + "\n",
);
console.log(`[points] 観測地点 ${obs.length}、潮位表の地点と対応づけ ${points.length}`);
