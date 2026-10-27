// 全国の潮位表の地点（気象庁「潮位表 掲載地点一覧」約240地点）と、気象庁の潮位観測地点（約70地点）の一覧を作り、
// lib/tideStations.json に保存する。府県は国土地理院の逆ジオコーダで求める（失敗したら近い地点の府県）。
// 出典：
//   https://www.data.jma.go.jp/kaiyou/db/tide/suisan/station.php （潮位表基準面の標高など）
//   https://www.data.jma.go.jp/kaiyou/db/tide/genbo/station.php （観測基準面の標高）
// ローカルで保存済みのHTMLから作るとき：node scripts/fetch-tide-stations.mjs <suisan.html> <genbo.html>
import { readFile, writeFile } from "node:fs/promises";

const UA = { "User-Agent": "Tsuredoki/0.2 (+https://tsuredoki-kansai.mametarou0510mame.workers.dev/about/)" };
const OUT = new URL("../lib/tideStations.json", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(urlOrPath) {
  if (!/^https?:/.test(urlOrPath)) return readFile(urlOrPath, "utf8");
  const res = await fetch(urlOrPath, { headers: UA });
  if (!res.ok) throw new Error(`${urlOrPath}: HTTP ${res.status}`);
  return res.text();
}

const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
const deg = (s) => {
  const m = strip(s).match(/(\d+)゜(\d+)'/);
  return m ? Math.round((Number(m[1]) + Number(m[2]) / 60) * 1000) / 1000 : null;
};
const numOrNull = (s) => {
  const n = Number(strip(s));
  return strip(s) === "" || strip(s) === "-" || Number.isNaN(n) ? null : n;
};

function rows(html) {
  return [...html.matchAll(/<tr\s+class="mtx">([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)(?=<td|$)/g)].map((c) => c[1].replace(/<\/td>\s*$/, "")));
}

// 潮位表の地点：番号, 記号, 名前, 緯度, 経度, MSL-潮位表基準面, MSLの標高, 潮位表基準面の標高, ...
function parseSuisan(html) {
  const out = [];
  for (const c of rows(html)) {
    if (c.length < 8) continue;
    const code = strip(c[1]);
    if (!/^[A-Z0-9]{2}$/.test(code)) continue;
    out.push({ code, name: strip(c[2]), lat: deg(c[3]), lon: deg(c[4]), mslAboveTable: numOrNull(c[5]), tableDatum: numOrNull(c[7]) });
  }
  return out;
}

// 観測地点：番号, 記号, 名前, 所在地, 緯度, 経度, 方式, 球分体(基準面上), 球分体(標高), 観測基準面の標高
function parseGenbo(html) {
  const out = new Map();
  for (const c of rows(html)) {
    if (c.length < 10) continue;
    const code = strip(c[1]);
    if (!/^[A-Z0-9]{2}$/.test(code)) continue;
    out.set(code, { name: strip(c[2]), address: strip(c[3]), obsDatum: numOrNull(c[9]) });
  }
  return out;
}

const PREFS = ["", "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];

async function prefOf(lat, lon, prev) {
  if (prev) return prev;
  // 地点の座標は分単位で海の上になることがあるため、少しずつずらして陸を探す
  const offsets = [[0, 0], [0.01, 0], [-0.01, 0], [0, 0.01], [0, -0.01], [0.02, 0.02], [-0.02, -0.02], [0.02, -0.02], [-0.02, 0.02]];
  for (const [a, b] of offsets) {
    try {
      const r = await fetch(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat + a}&lon=${lon + b}`, { headers: UA });
      const j = await r.json();
      const cd = j?.results?.muniCd;
      if (cd) return PREFS[Number(String(cd).padStart(5, "0").slice(0, 2))] || null;
    } catch {
      /* 次を試す */
    }
    await sleep(300);
  }
  return null;
}

const [suisanSrc, genboSrc] = process.argv.slice(2);
const suisan = parseSuisan(await load(suisanSrc ?? "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/station.php"));
await sleep(1000);
const genbo = parseGenbo(await load(genboSrc ?? "https://www.data.jma.go.jp/kaiyou/db/tide/genbo/station.php"));
if (suisan.length < 200) throw new Error(`潮位表の地点が少なすぎます (${suisan.length})`);

let old = {};
try {
  old = Object.fromEntries(JSON.parse(await readFile(OUT, "utf8")).stations.map((s) => [s.code, s]));
} catch {
  /* はじめて */
}

const offline = !!suisanSrc;
const stations = [];
for (const s of suisan) {
  const g = genbo.get(s.code);
  // 府県：観測地点の所在地 → 前回の逆ジオコーダの結果 → 逆ジオコーダ（オンライン時）→ 近い地点
  let pref = null;
  let prefBy = null;
  if (g?.address) {
    pref = PREFS.find((p) => p && g.address.startsWith(p.replace(/[都府県]$/, ""))) ?? null;
    if (pref) prefBy = "address";
  }
  if (!pref && old[s.code]?.prefBy === "gsi") [pref, prefBy] = [old[s.code].pref, "gsi"];
  if (!pref && !offline && s.lat && s.lon) {
    pref = await prefOf(s.lat, s.lon, null);
    if (pref) prefBy = "gsi";
  }
  stations.push({
    code: s.code,
    name: s.name,
    pref,
    prefBy,
    lat: s.lat,
    lon: s.lon,
    tableDatum: s.tableDatum, // 潮位表基準面の標高（cm）
    obs: g && g.obsDatum !== null ? { datum: g.obsDatum } : null, // 気象庁の潮位観測地点（観測基準面の標高 cm）
  });
}
// 府県がわからなかった地点は、いちばん近い地点の府県にする
for (const s of stations) {
  if (s.pref || s.lat === null) continue;
  const near = stations
    .filter((t) => t.pref && t.prefBy !== "near" && t.lat !== null)
    .sort((a, b) => Math.hypot(a.lat - s.lat, a.lon - s.lon) - Math.hypot(b.lat - s.lat, b.lon - s.lon))[0];
  if (near) [s.pref, s.prefBy] = [near.pref, "near"];
}

await writeFile(
  OUT,
  JSON.stringify(
    {
      note: "気象庁「潮位表 掲載地点一覧」「潮汐観測地点一覧」をもとに作成。府県は国土地理院の逆ジオコーダ（失敗時は近い地点）による。",
      sources: ["https://www.data.jma.go.jp/kaiyou/db/tide/suisan/station.php", "https://www.data.jma.go.jp/kaiyou/db/tide/genbo/station.php"],
      stations,
    },
    null,
    1,
  ) + "\n",
);
console.log(`[stations] 潮位表 ${stations.length}地点（うち気象庁の観測あり ${stations.filter((s) => s.obs).length}、府県なし ${stations.filter((s) => !s.pref).length}）`);
