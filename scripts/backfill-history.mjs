// 過去の釣果記事と過去の潮位表を取り込み、data/history/ に保存する（釣れ指数の学習用）。
// - 一度だけ全件を取り込む想定。途中で止まっても続きから再開できる（cursor を保存）。
// - 相手サーバーへの負担を抑えるため、1リクエストごとに3秒あける。
// - 保存するのは日付・魚種・時間帯タグ・サイズだけ（個人名・本文・写真は保存しない）。
// 使い方: node scripts/backfill-history.mjs <kishiwada|hiraiso|tides> [最大分数]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseKishiwadaList, parseRss, parseHiraisoDaily, parseHiraisoDailyTitle, rssDateToJst } from "./catch-parsers.mjs";
import { parseFile } from "./tide-parser.mjs";

const UA = "TsuredokiKansai/0.1 (+https://tsuredoki-kansai.mametarou0510mame.workers.dev/about/)";
const DIR = new URL("../data/history/", import.meta.url);
const target = process.argv[2];
const maxMinutes = Number(process.argv[3] ?? 320);
const deadline = Date.now() + maxMinutes * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  await sleep(3000);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function load(name, fallback) {
  try {
    return JSON.parse(await readFile(new URL(name, DIR), "utf8"));
  } catch {
    return fallback;
  }
}
async function save(name, data) {
  await mkdir(DIR, { recursive: true });
  await writeFile(new URL(name, DIR), JSON.stringify(data) + "\n");
}

// days[date] = { n: その日の記事数, s: { 魚種: 記事数 }, t: { 時間帯: 記事数 } }
function addDay(h, date, species, time) {
  const d = (h.days[date] ??= { n: 0, s: {}, t: {} });
  d.n += 1;
  for (const sp of species) d.s[sp] = (d.s[sp] ?? 0) + 1;
  if (time) for (const t of time.split("・")) d.t[t] = (d.t[t] ?? 0) + 1;
}

async function kishiwada() {
  const file = "kishiwada-ichimonji.json";
  const h = await load(file, { spot: "kishiwada-ichimonji", source: "https://kishiwadatosen.com/result/", cursor: 1, done: false, days: {} });
  if (h.done) return console.log("[history] kishiwada: 完了済み");
  // 新しい記事が増えるとページがずれるため、取得済みの最古の日付より古い記事だけを数える
  const oldest = Object.keys(h.days).sort()[0] ?? "9999-12-31";
  let page = h.cursor;
  while (Date.now() < deadline) {
    const html = await get(page === 1 ? "https://kishiwadatosen.com/result/" : `https://kishiwadatosen.com/result/page/${page}/`);
    if (!html) {
      h.done = true;
      break;
    }
    const posts = new Map(); // 1記事 = 同じ key の基部
    for (const r of parseKishiwadaList(html)) {
      const base = r.key.replace(/#\d+$/, "");
      const p = posts.get(base) ?? { date: r.date, species: [], time: r.time };
      p.species.push(r.species);
      posts.set(base, p);
    }
    if (posts.size === 0 && !html.includes("result-bigbox")) {
      h.done = true;
      break;
    }
    // 初回は全件。再開時は保存済みの最古の日より前の記事だけを足す（ページずれによる二重計上を防ぐ）
    for (const p of posts.values()) if (p.date < oldest) addDay(h, p.date, p.species, p.time);
    page += 1;
    h.cursor = page;
    if (page % 50 === 0) {
      await save(file, h);
      console.log(`[history] kishiwada: ${page}ページ目まで（${Object.keys(h.days).length}日分）`);
    }
  }
  await save(file, h);
  console.log(`[history] kishiwada: cursor=${h.cursor} done=${h.done} 日数=${Object.keys(h.days).length}`);
}

async function hiraiso() {
  const file = "hiraiso-umizuri-koen.json";
  const h = await load(file, {
    spot: "hiraiso-umizuri-koen",
    source: "https://kobeumiduri.jp/fishresult/",
    cursor: 1,
    done: false,
    seen: [],
    days: {},
  });
  if (h.done) return console.log("[history] hiraiso: 完了済み");
  const seen = new Set(h.seen);
  let page = h.cursor;
  while (Date.now() < deadline) {
    const xml = await get(`https://kobeumiduri.jp/fishresult/feed/?paged=${page}`);
    if (!xml) {
      h.done = true;
      break;
    }
    for (const item of parseRss(xml)) {
      if (seen.has(item.link) || Date.now() >= deadline) continue;
      const html = await get(item.link);
      if (!html) continue;
      const date = parseHiraisoDailyTitle(html) ?? rssDateToJst(item.pubDate);
      const reports = parseHiraisoDaily(html);
      if (date && reports.length) {
        // 平磯は1ページ=1日。投稿者ごとの記録を1件として数える
        for (const r of reports) addDay(h, date, [r.species], r.time ? (/^([0-9]|1[01]):/.test(r.time) ? "午前" : "午後") : null);
      }
      seen.add(item.link);
    }
    if (Date.now() >= deadline) break;
    page += 1;
    h.cursor = page;
    h.seen = [...seen];
    if (page % 10 === 0) {
      await save(file, h);
      console.log(`[history] hiraiso: フィード${page}ページ目まで（${Object.keys(h.days).length}日分）`);
    }
  }
  h.seen = [...seen];
  await save(file, h);
  console.log(`[history] hiraiso: cursor=${h.cursor} done=${h.done} 日数=${Object.keys(h.days).length}`);
}

// 過去の潮位表から各日の干満差(cm)だけを保存する
async function tides() {
  const stations = ["J2", "AK"];
  const thisYear = new Date(Date.now() + 9 * 3600 * 1000).getUTCFullYear();
  for (const code of stations) {
    const file = `tides-${code}.json`;
    const t = await load(file, { station: code, ranges: {} });
    for (let y = 2015; y < thisYear; y++) {
      if (Object.keys(t.ranges).some((d) => d.startsWith(`${y}-`))) continue;
      const txt = await get(`https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${y}/${code}.txt`);
      if (!txt) {
        console.warn(`[history] tides ${code} ${y}: なし`);
        continue;
      }
      for (const d of parseFile(txt)) {
        const v = d.hourly.filter((x) => x !== null);
        if (v.length) t.ranges[d.date] = Math.max(...v) - Math.min(...v);
      }
      console.log(`[history] tides ${code} ${y}: OK`);
    }
    await save(file, t);
  }
}

if (target === "kishiwada") await kishiwada();
else if (target === "hiraiso") await hiraiso();
else if (target === "tides") await tides();
else console.error("usage: backfill-history.mjs <kishiwada|hiraiso|tides> [minutes]");
