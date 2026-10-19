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
  normalizeSpecies,
  parseKishiwadaList,
  parseCatchTables,
  parseAmagasakiList,
  parsePointList,
  parseNaruohamaChoka,
  parseShimotsuPost,
  parseAtomEntries,
  storeBlogReports,
} from "./catch-parsers.mjs";

const OUT = new URL("../public/data/catches.json", import.meta.url);
const UA = "TsuredokiKansai/0.1 (+https://tsuredoki-kansai.mametarou0510mame.workers.dev/about/)";
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
      console.log(`::warning::[catches] hiraiso 日別ページ失敗: ${e.message}`);
    }
  }
  return { reports, monthly };
}

async function kishiwada() {
  const reports = [];
  for (const page of ["https://kishiwadatosen.com/result/", "https://kishiwadatosen.com/result/page/2/", "https://kishiwadatosen.com/result/page/3/"]) {
    const html = await get(page);
    for (const r of parseKishiwadaList(html)) {
      const { key, ...rest } = r;
      reports.push({ id: key, ...rest, url: "https://kishiwadatosen.com/result/" });
    }
  }
  return { reports, monthly: null };
}

// 須磨海づり公園：RSSで日別ページを見つけ、各ページの釣果表（魚種・サイズ・匹数）を読む
async function suma() {
  const xml = await get("https://sumasakana-park.com/fishing/feed/");
  const reports = [];
  for (const item of parseRss(xml).slice(0, 4)) {
    try {
      await sleep(3000); // 須磨のサーバーに負担をかけないよう間隔を広げる
      const pub = rssDateToJst(item.pubDate);
      const md = item.title.match(/(\d{1,2})\/(\d{1,2})/);
      if (!pub) continue;
      const date = md ? `${pub.slice(0, 4)}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}` : pub;
      const html = await get(item.link);
      parseCatchTables(html).forEach((r, i) => reports.push({ id: `${item.link}#${i}`, date, ...r, time: null, url: item.link }));
    } catch (e) {
      console.log(`::warning::[catches] suma 日別ページ失敗: ${e.message}`);
    }
  }
  return { reports, monthly: null };
}

// 尼崎市立魚つり公園：一覧から日別ページ（/fishing/YYYYMMDD.html）を開き、釣果表（魚種・サイズ・匹数・釣り方）を読む
async function amagasaki() {
  const list = parseAmagasakiList(await get("https://amagasaki-uoturikouen.com/fishing/index.html"));
  const reports = [];
  for (const d of list.slice(0, 7)) {
    try {
      const html = await get(d.url);
      parseCatchTables(html).forEach((r, i) => reports.push({ id: `${d.url}#${i}`, date: d.date, ...r, time: null, url: d.url }));
    } catch (e) {
      console.log(`::warning::[catches] amagasaki 日別ページ失敗: ${e.message}`);
    }
  }
  return { reports, monthly: null };
}

// 釣具のポイント（関西エリアのお持込釣果）。釣場の書き方から当サイトの釣り場に結び付くものだけ。
async function pointKansai() {
  const reports = [];
  for (const page of [1, 2, 3, 4, 5]) {
    const html = await get(`https://www.point-i.jp/fishing_infos?area_id=94&shop_id=0&page=${page}`);
    if (!html.includes("/fishing_infos/")) break;
    reports.push(...parsePointList(html));
  }
  return { reports, monthly: null };
}

// 鳴尾浜臨海公園 海づり広場：釣果一覧ページ（日付ごとに魚種・サイズ・合計匹数）
async function naruohama() {
  const html = await get("http://www.naruohama-park.com/choka/");
  const reports = parseNaruohamaChoka(html).map((r, i) => ({ id: `naruo-${r.date}-${r.species}-${i}`, ...r, url: "http://www.naruohama-park.com/choka/" }));
  return { reports, monthly: null };
}

// 下津ピアーランド：釣果のRSSから1件ずつのページを開く
async function shimotsu() {
  const xml = await get("https://www.shimotsu-pialand.com/fishing/feed/");
  const reports = [];
  for (const item of parseRss(xml).slice(0, 10)) {
    const link = item.link.split("?")[0];
    const d = link.match(/\/fishing\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (!d) continue;
    try {
      const html = await get(link);
      parseShimotsuPost(html).forEach((r, i) => reports.push({ id: `${link}#${i}`, date: `${d[1]}-${d[2]}-${d[3]}`, ...r, url: link }));
    } catch (e) {
      console.log(`::warning::[catches] shimotsu 個別ページ失敗: ${e.message}`);
    }
  }
  return { reports, monthly: null };
}

// まるは釣具の店舗ブログ：釣り場の名前が書かれた記事だけを、その釣り場の釣果として使う
const maruhaBlog = (store) => async () => {
  const xml = await get(`https://anglers.lekumo.biz/${store}/atom.xml`);
  return { reports: storeBlogReports(parseAtomEntries(xml), `maruha-${store}-`), monthly: null };
};

// 南あわじ海釣り公園メガフロート：市が公開しているExcelの釣果（scripts/fetch-xls-catches.py が先に読み込む）
async function minamiawaji() {
  const d = JSON.parse(await readFile(new URL("../data/extra-catches/minamiawaji.json", import.meta.url), "utf8"));
  const reports = d.reports.map((r, i) => ({
    id: `mega-${r.date}-${i}`,
    date: r.date,
    species: normalizeSpecies(r.species),
    sizeCm: r.sizeCm ?? null,
    count: r.count ?? null,
    method: null,
    time: null,
    url: d.url,
  }));
  return { reports, monthly: null };
}

// 当サイトの「みんなの釣果投稿」（投稿受付サーバーの公開API）
async function userPosts() {
  const res = await fetch("https://tsuredoki-kansai.mametarou0510mame.workers.dev/api/posts?days=30", { headers: { "User-Agent": UA } });
  if (res.status === 404) return { reports: [], monthly: null }; // 投稿機能が未公開
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { posts } = await res.json();
  const reports = (posts ?? []).map((p) => ({
    spot: p.spot,
    id: `user-${p.id}`,
    date: p.date,
    species: p.species,
    sizeCm: p.sizeCm ?? null,
    count: p.count ?? null,
    method: p.method ?? null,
    time: p.timeBand ?? null,
    url: `https://tsuredoki-kansai.mametarou0510mame.workers.dev/post/`,
  }));
  return { reports, monthly: null };
}

const SOURCES = [
  { spot: "marina-city-tsuri-koen", name: "和歌山マリーナシティ釣り公園 釣果情報", url: "https://www.marinacity.com/tsuri/news/", run: marinaCity },
  { spot: "hiraiso-umizuri-koen", name: "平磯海づり公園 釣果情報", url: "https://kobeumiduri.jp/fishresult/", run: hiraiso },
  { spot: "kishiwada-ichimonji", name: "岸和田渡船 釣果情報", url: "https://kishiwadatosen.com/result/", run: kishiwada },
  { spot: "suma-umizuri-koen", name: "須磨海づり公園 釣果情報", url: "https://sumasakana-park.com/fishing/", run: suma },
  { spot: "amagasaki-uotsuri-koen", name: "尼崎市立魚つり公園 釣果情報", url: "https://amagasaki-uoturikouen.com/fishing/index.html", run: amagasaki },
  { spot: "naruohama-umizuri-hiroba", name: "鳴尾浜臨海公園 海づり広場 釣果情報", url: "http://www.naruohama-park.com/choka/", run: naruohama },
  { spot: "shimotsu-pialand", name: "下津ピアーランド 釣果情報", url: "https://www.shimotsu-pialand.com/fishing/", run: shimotsu },
  { spot: "minamiawaji-megafloat", name: "南あわじ海釣り公園メガフロート 釣果情報（南あわじ市）", url: "https://www.city.minamiawaji.hyogo.jp/soshiki/suisan/umidurikouen.html", run: minamiawaji },
  // 複数の釣り場にまたがる出典（各釣果に spot が入っている）
  ...[
    ["akashi", "明石店"],
    ["futami", "二見店"],
    ["nishimai", "西舞子店"],
    ["sennan", "泉南店"],
    ["himeji", "姫路店"],
    ["awaji", "洲本店"],
  ].map(([store, label]) => ({
    spot: null,
    key: `maruha-${store}`,
    idPrefix: `maruha-${store}-`,
    name: `まるは釣具 ${label} 釣果ブログ`,
    url: `https://anglers.lekumo.biz/${store}/`,
    run: maruhaBlog(store),
  })),
  { spot: null, key: "point-kansai", idPrefix: "point-", name: "釣具のポイント お持込釣果", url: "https://www.point-i.jp/fishing_infos?area_id=94", run: pointKansai },
  { spot: null, key: "user-posts", idPrefix: "user-", name: "ツレドキ関西 みんなの釣果投稿", url: "https://tsuredoki-kansai.mametarou0510mame.workers.dev/post/", run: userPosts },
];

// ---- 実行 ----
let prev = { reports: [], monthly: {}, sources: [] };
try {
  prev = JSON.parse(await readFile(OUT, "utf8"));
} catch {
  /* 初回 */
}

// 魚種名の表記ルールを変えたときに過去分も揃うよう、保存済みデータも正規化し直す
const byId = new Map(
  prev.reports
    .filter((r) => r.date >= cutoff)
    .map((r) => [`${r.spot}|${r.id}`, { ...r, species: normalizeSpecies(r.species) }]),
);
const monthly = { ...(prev.monthly ?? {}) };
const sources = [];

for (const src of SOURCES) {
  const label = src.spot ?? src.key;
  const prevSrc = prev.sources?.find((s) => (s.key ?? s.spot) === label);
  let ok = false;
  try {
    const { reports, monthly: m } = await src.run();
    // 投稿は毎回すべて取り直す（管理者が非表示にした投稿を残さないため）
    if (src.key === "user-posts") for (const [k, r] of byId) if (String(r.id).startsWith("user-")) byId.delete(k);
    for (const r of reports) {
      const spot = r.spot ?? src.spot;
      if (r.date >= cutoff && r.date <= todayJst) byId.set(`${spot}|${r.id}`, { ...r, spot });
    }
    if (m && src.spot) monthly[src.spot] = m;
    ok = true;
    console.log(`::notice::[catches] ${label}: ${reports.length}件`);
  } catch (e) {
    console.log(`::warning::[catches] ${label}: 失敗 ${e.message}`);
  }
  const lastSuccess = ok ? todayJst : prevSrc?.lastSuccess ?? null;
  if (src.spot) sources.push({ spot: src.spot, name: src.name, url: src.url, lastSuccess });
  else {
    // 複数の釣り場にまたがる出典は、釣果が1件でもある釣り場ごとに出典として登録する
    const spots = new Set([...byId.values()].filter((r) => r.id.startsWith(src.idPrefix)).map((r) => r.spot));
    for (const spot of spots) sources.push({ spot, key: src.key, name: src.name, url: src.url, lastSuccess });
  }
}

const reports = [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const data = { updatedOn: todayJst, sources, monthly, reports };
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(data, null, 1) + "\n");
console.log(`[catches] 保存: ${reports.length}件`);
