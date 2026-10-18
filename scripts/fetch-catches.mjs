// 施設公式の釣果情報を取得し、public/data/catches.json に保存する（GitHub Actionsで1日1回実行）。
// - robots.txt で許可された公開ページ・RSSのみ。1リクエストごとに間隔をあける。
// - 保存するのは日付・魚種・サイズ・尾数・仕掛けなどの事実と元ページのURLだけ（個人名・写真は保存しない）。
// - 取得に失敗した施設は前回のデータを残す。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  parseRss,
  rssDateToJst,
  parseMarinaTitle,
  parseHiraisoDaily,
  parseHiraisoDailyTitle,
  parseHiraisoMonthlyTable,
} from "./catch-parsers.mjs";

const OUT = new URL("../public/data/catches.json", import.meta.url);
const UA = "FishingBaseJapan/0.1 (+https://fishingbase-japan.mametarou0510mame.workers.dev/about/)";
const KEEP_DAYS = 90;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const text = await res.text();
  await sleep(1500);
  return text;
}

const todayJst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const cutoff = new Date(Date.now() + 9 * 3600 * 1000 - KEEP_DAYS * 86400 * 1000).toISOString().slice(0, 10);

// ---- 各施設 ----
async function marinaCity() {
  const xml = await get("https://www.marinacity.com/tsuri/feed/");
  const reports = [];
  for (const item of parseRss(xml)) {
    const date = rssDateToJst(item.pubDate);
    if (!date) continue;
    parseMarinaTitle(item.title).forEach((r, i) =>
      reports.push({ id: `${item.link}#${i}`, date, ...r, time: null, url: item.link }),
    );
  }
  return { reports, monthly: null };
}

async function hiraiso() {
  const listHtml = await get("https://kobeumiduri.jp/fishresult/");
  const rows = parseHiraisoMonthlyTable(listHtml);
  const monthly = rows.length
    ? { month: todayJst.slice(0, 7), url: "https://kobeumiduri.jp/fishresult/", rows }
    : null;

  const xml = await get("https://kobeumiduri.jp/fishresult/feed/");
  const reports = [];
  for (const item of parseRss(xml).slice(0, 10)) {
    try {
      const html = await get(item.link);
      const date = parseHiraisoDailyTitle(html) ?? rssDateToJst(item.pubDate);
      if (!date) continue;
      parseHiraisoDaily(html).forEach((r, i) => reports.push({ id: `${item.link}#${i}`, date, ...r, url: item.link }));
    } catch (e) {
      console.warn(`[catches] hiraiso 日別ページ失敗: ${e.message}`);
    }
  }
  return { reports, monthly };
}

const SOURCES = [
  { spot: "marina-city-tsuri-koen", name: "和歌山マリーナシティ釣り公園 釣果情報", url: "https://www.marinacity.com/tsuri/news/", run: marinaCity },
  { spot: "hiraiso-umizuri-koen", name: "平磯海づり公園 釣果情報", url: "https://kobeumiduri.jp/fishresult/", run: hiraiso },
];

// ---- 実行 ----
let prev = { reports: [], monthly: {}, sources: [] };
try {
  prev = JSON.parse(await readFile(OUT, "utf8"));
} catch {
  /* 初回 */
}

const byId = new Map(prev.reports.filter((r) => r.date >= cutoff).map((r) => [`${r.spot}|${r.id}`, r]));
const monthly = { ...(prev.monthly ?? {}) };
const sources = [];

for (const src of SOURCES) {
  const prevSrc = prev.sources?.find((s) => s.spot === src.spot);
  try {
    const { reports, monthly: m } = await src.run();
    for (const r of reports) if (r.date >= cutoff && r.date <= todayJst) byId.set(`${src.spot}|${r.id}`, { spot: src.spot, ...r });
    if (m) monthly[src.spot] = m;
    sources.push({ spot: src.spot, name: src.name, url: src.url, lastSuccess: todayJst });
    console.log(`[catches] ${src.spot}: ${reports.length}件`);
  } catch (e) {
    console.warn(`[catches] ${src.spot}: 失敗 ${e.message}`);
    sources.push({ spot: src.spot, name: src.name, url: src.url, lastSuccess: prevSrc?.lastSuccess ?? null });
  }
}

const reports = [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const data = { updatedOn: todayJst, sources, monthly, reports };
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(data, null, 1) + "\n");
console.log(`[catches] 保存: ${reports.length}件`);
