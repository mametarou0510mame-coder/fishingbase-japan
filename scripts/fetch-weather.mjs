// 気象庁の府県天気予報（天気・風・波・降水確率）を取得し public/data/weather.json に保存する。
// 出典: 気象庁ホームページ。当サイトは独自の予報は行わず、発表内容をそのまま表示する。
import { mkdir, writeFile } from "node:fs/promises";

// 府県予報の取得単位（office）と、使う予報区（area）
const TARGETS = [
  { office: "270000", area: "270000" }, // 大阪府
  { office: "280000", area: "280010" }, // 兵庫県南部
  { office: "300000", area: "300010" }, // 和歌山県北部
  { office: "260000", area: "260020" }, // 京都府北部
];

// 気象庁の文は単語ごとに全角空白で区切られているので、読みやすく整える
// 例: "北東の風　後　南の風　海上　では" → "北東の風 のち 南の風、海上では"
const z2h = (s) =>
  (s ?? "")
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[　\s]+/g, " ")
    .trim()
    .split(" 後 ")
    .map((part) => part.replace(/ 海上 では /g, "、海上では").replace(/ /g, ""))
    .join(" のち ");

const out = { fetchedAt: new Date().toISOString(), source: "気象庁", areas: {} };

for (const t of TARGETS) {
  try {
    const res = await fetch(`https://www.jma.go.jp/bosai/forecast/data/forecast/${t.office}.json`, {
      headers: { "User-Agent": "FishingBaseJapan/0.1" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const short = json[0];
    const ts0 = short.timeSeries[0];
    const a0 = ts0.areas.find((a) => a.area.code === t.area);
    const ts1 = short.timeSeries[1];
    const a1 = ts1?.areas.find((a) => a.area.code === t.area);
    if (!a0) throw new Error(`area ${t.area} not found`);
    out.areas[t.area] = {
      name: a0.area.name,
      office: short.publishingOffice,
      reportDatetime: short.reportDatetime,
      days: ts0.timeDefines.map((d, i) => ({
        date: d.slice(0, 10),
        weather: z2h(a0.weathers?.[i]),
        wind: z2h(a0.winds?.[i]),
        wave: z2h(a0.waves?.[i]),
      })),
      pops: (ts1?.timeDefines ?? []).map((d, i) => ({ time: d, pop: a1?.pops?.[i] ?? null })),
    };
    console.log(`[weather] ${t.area} OK`);
  } catch (e) {
    console.warn(`[weather] ${t.area}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 800));
}

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/weather.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
