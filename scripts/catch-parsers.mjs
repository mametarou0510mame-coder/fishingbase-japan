// 施設公式の釣果情報を解析する純粋関数群（ネットワークアクセスなし・テスト可能）。
// 取り出すのは魚種・サイズ・尾数・仕掛け・時間などの事実のみ。
// 投稿者の氏名・住所・写真は読み込まない（個人情報を保存しないため）。

// ---- 魚種名の正規化 ----
// [表示名, 別名...]。長い別名から順に照合する。
const SPECIES_DICT = [
  ["アジ・サバ・イワシ", "アジ/サバ/イワシ", "アジ・サバ・イワシ"],
  ["青物（種類不明）", "青物"],
  ["アジ", "マアジ", "小アジ", "豆アジ", "アジ"],
  ["サバ", "マサバ", "ゴマサバ", "小サバ", "サバ"],
  ["イワシ", "カタクチイワシ", "マイワシ", "ウルメイワシ", "イワシ"],
  ["タチウオ", "太刀魚", "タチウオ"],
  ["チヌ（クロダイ）", "クロダイ", "黒鯛", "チヌ"],
  ["ハマチ・ブリ", "ツバス", "ハマチ", "メジロ", "ワラサ", "ブリ"],
  ["サゴシ（サワラ）", "サゴシ", "サワラ"],
  ["シオ（カンパチ）", "カンパチ", "シオ"],
  ["メバル", "メバル"],
  ["ガシラ（カサゴ）", "カサゴ", "ガシラ"],
  ["アコウ（キジハタ）", "キジハタ", "アコウ"],
  ["グレ（メジナ）", "メジナ", "グレ"],
  ["マダイ", "マダイ", "真鯛", "チャリコ"],
  ["ヘダイ", "ヘダイ"],
  ["コブダイ", "コブダイ"],
  ["ウミタナゴ", "ウミタナゴ"],
  ["ベラ", "キュウセン", "ギザミ", "ベラ"],
  ["カワハギ", "マルハギ", "カワハギ"],
  ["ウマヅラハギ", "ウマヅラハギ"],
  ["サヨリ", "サヨリ"],
  ["スズキ", "シーバス", "セイゴ", "ハネ", "スズキ"],
  ["アオリイカ", "アオリイカ"],
  ["タコ", "マダコ", "イイダコ", "タコ"],
  ["キス", "シロギス", "キス"],
  ["カレイ", "マコガレイ", "カレイ"],
  ["ヒラメ", "ヒラメ"],
  ["アイナメ", "アイナメ"],
  ["ハゼ", "ハゼ"],
  ["ボラ", "ボラ"],
  ["コノシロ", "コノシロ"],
  ["イシダイ", "イシダイ"],
  ["ハオコゼ", "ハオコゼ"],
  ["イサキ", "ウリボウ", "イサキ"],
  ["サッパ", "サッパ"],
  ["コロダイ", "コロダイ"],
  ["ハモ", "ハモ"],
  ["エソ", "エソ"],
  ["フグ", "クサフグ", "フグ"],
];
const ALIASES = SPECIES_DICT.flatMap(([canon, ...aliases]) => aliases.map((a) => [a, canon])).sort(
  (a, b) => b[0].length - a[0].length,
);

// 文字列に含まれる魚種（正規化名）を出現順・重複なしで返す
export function findSpecies(text) {
  const found = [];
  let rest = text;
  for (const [alias, canon] of ALIASES) {
    if (rest.includes(alias)) {
      if (!found.includes(canon)) found.push(canon);
      rest = rest.split(alias).join("　"); // 「小アジ」の後に「アジ」で二重に数えない
    }
  }
  return found;
}

export function normalizeSpecies(raw) {
  const cleaned = raw.replace(/[（(][^）)]*[）)]/g, "").replace(/等$/, "").trim();
  return findSpecies(cleaned)[0] ?? cleaned;
}

// ---- 共通ユーティリティ ----
const toHalf = (s) =>
  s
    .replace(/[０-９．Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .replace(/[〜～]/g, "~")
    .replace(/㎝/g, "cm");

const stripTags = (h) =>
  h
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&");
}

// "36cm" "10〜16cm" "43.5㎝" → 最大値（cm）
// "12cm~15cm" "15~23cm" "47cm1470g" にも対応（cm の直前にある数値・範囲の最大値。g などは無視）
export function parseMaxSizeCm(text) {
  const t = toHalf(text);
  const nums = [];
  for (const m of t.matchAll(/((?:\d+(?:\.\d+)?\s*(?:cm)?\s*~\s*)?\d+(?:\.\d+)?)\s*cm/gi)) {
    for (const n of m[1].matchAll(/\d+(?:\.\d+)?/g)) nums.push(Number(n[0]));
  }
  return nums.length ? Math.max(...nums) : null;
}

function parseCount(text) {
  const m = toHalf(text).match(/(\d+)\s*(?:尾|匹|杯|枚|本)/);
  return m ? Number(m[1]) : null;
}

// ---- RSS ----
export function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const body = m[1];
    const tag = (name) => {
      const r = body.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
      return r ? decodeEntities(r[1].trim()) : "";
    };
    items.push({ title: tag("title"), link: tag("link"), pubDate: tag("pubDate") });
  }
  return items;
}

export function rssDateToJst(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// ---- 和歌山マリーナシティ：RSSの見出しから ----
// 例: "キジハタ 36cm(サビキ釣り/ポイント⑨)" "紀州釣り爆釣 ヘダイ等(ポイント突堤)"
export function parseMarinaTitle(title) {
  const method = (title.match(/[（(]([^）)]*)[）)]/)?.[1] ?? "")
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && !/^ポイント/.test(s))
    .join("・");
  const head = title.replace(/[（(][^）)]*[）)]/g, " ");
  const species = findSpecies(head);
  const sizeCm = parseMaxSizeCm(head);
  return species.map((sp) => ({ species: sp, sizeCm: species.length === 1 ? sizeCm : null, count: null, method: method || null }));
}

// ---- 平磯海づり公園：1日分の釣果ページ ----
export function parseHiraisoDailyTitle(html) {
  const m = toHalf(html).match(/(\d{4})年(\d{1,2})月(\d{1,2})日[^<]*の釣果情報/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

export function parseHiraisoDaily(html) {
  const out = [];
  // 投稿者ブロック(.fishdata-owner)は読まず、.fishdata の中の項目だけを読む
  for (const block of html.split('<div class="fishdata">').slice(1)) {
    const fields = {};
    for (const m of block.matchAll(
      /<p class="fishdata-name">([\s\S]*?)<\/p>\s*<p class="fishdata-content">([\s\S]*?)<\/p>/g,
    )) {
      fields[stripTags(m[1])] = stripTags(m[2]);
    }
    if (!fields["魚種"]) continue;
    out.push({
      species: normalizeSpecies(fields["魚種"]),
      sizeCm: fields["サイズ"] ? parseMaxSizeCm(fields["サイズ"]) : null,
      count: fields["尾数"] ? parseCount(fields["尾数"]) : null,
      method: fields["仕掛"] || null,
      time: fields["釣行時間"] ? toHalf(fields["釣行時間"]).replace(/\s+/g, "").replace(/[（(].*$/, "") : null,
    });
  }
  return out;
}

// ---- 平磯海づり公園：一覧ページの「今月の釣果」表 ----
export function parseHiraisoMonthlyTable(html) {
  const table = html.match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!table) return [];
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) =>
    [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => stripTags(c[1])),
  );
  const header = rows[0] ?? [];
  if (!header[0]?.includes("魚種")) return [];
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => ({
      species: normalizeSpecies(r[0]),
      stars: (r[1].match(/★/g) ?? []).length,
      size: toHalf(r[2] ?? ""),
      perPerson: toHalf(r[3] ?? ""),
      method: r[4] ?? "",
      bait: r[5] ?? "",
    }));
}

// ---- 岸和田渡船：釣果一覧ページ ----
// 1件 = .result-bigbox。日付(.title)とタグ(.arch_term)だけを読む。
// 見出し・本文・画像の説明文には利用者の名前が入るため読まない。
const TIME_TAGS = ["早朝", "午前", "午後", "夕方", "夜", "夜釣り"];
export function parseKishiwadaList(html) {
  const out = [];
  const seen = new Map();
  for (const block of html.split('class="result-bigbox').slice(1)) {
    const dm = toHalf(block).match(/<div class="title">\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*<\/div>/);
    const d = dm ? [dm[0], dm[1], dm[2].padStart(2, "0"), dm[3].padStart(2, "0")] : null;
    const term = block.match(/<div class="arch_term">([\s\S]*?)<\/div>/);
    if (!d || !term) continue;
    const tags = [...term[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((m) => stripTags(m[1]));
    const time = tags.filter((t) => TIME_TAGS.includes(t)).join("・") || null;
    const species = [...new Set(tags.filter((t) => !TIME_TAGS.includes(t)).flatMap((t) => findSpecies(t)))];
    const img = block.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? block.match(/href="([^"]+\.(?:jpe?g|png))"/i)?.[1] ?? "";
    const base = `${d[1]}${d[2]}${d[3]}-${img.split("/").pop() || tags.join("_")}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const key = n === 1 ? base : `${base}-${n}`;
    species.forEach((sp, i) =>
      out.push({ key: `${key}#${i}`, date: `${d[1]}-${d[2]}-${d[3]}`, species: sp, sizeCm: null, count: null, method: null, time }),
    );
  }
  return out;
}


// ---- 汎用：釣果の表（尼崎市立魚つり公園・須磨海づり公園）----
// 見出し行に「魚種」があれば列名で、なければ [魚種, サイズ, 匹数] の順とみなす。
export function parseCatchTables(html) {
  const out = [];
  for (const t of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    if (/wp-calendar|business-hours/.test(t[0].slice(0, 200))) continue;
    const rows = [...t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
      [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => decodeEntities(stripTags(c[1]))),
    );
    if (!rows.length) continue;
    let cols = { species: 0, size: 1, count: 2, method: -1 };
    let start = 0;
    const head = rows[0];
    if (head.some((c) => c.includes("魚種"))) {
      const idx = (re) => head.findIndex((c) => re.test(c));
      cols = { species: idx(/魚種/), size: idx(/サイズ|寸法/), count: idx(/匹|尾|数/), method: idx(/釣り方|仕掛/) };
      start = 1;
    } else if (head.length < 2 || head.length > 4) continue;
    for (const r of rows.slice(start)) {
      const name = r[cols.species] ?? "";
      const species = findSpecies(name);
      if (!species.length) continue;
      const size = cols.size >= 0 ? r[cols.size] ?? "" : "";
      const countText = cols.count >= 0 ? r[cols.count] ?? "" : "";
      const method = cols.method >= 0 ? (r[cols.method] ?? "").trim() || null : null;
      out.push({ species: species[0], sizeCm: parseMaxSizeCm(size), count: parseCount(countText), method });
    }
  }
  return out;
}

// 尼崎市立魚つり公園：一覧ページから日別ページ（/fishing/YYYYMMDD.html）のURLを集める
export function parseAmagasakiList(html) {
  const set = new Set();
  for (const m of html.matchAll(/href="([^"]*\/fishing\/(\d{8})\.html)"/g)) set.add(m[2]);
  return [...set].map((d) => ({ date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, url: `https://amagasaki-uoturikouen.com/fishing/${d}.html` }));
}

// ---- 釣具のポイント（関西エリアの「お持込釣果」一覧）----
// 釣人の名前・スタッフ名・写真は保存しない。釣場の書き方から当サイトの釣り場に結び付けられるものだけ使う。
export const POINT_PLACE_RULES = [
  [/武庫川一文字|武庫一|武庫川渡船/, "mukogawa-ichimonji"],
  [/岸和田一文字|岸和田渡船|岸一/, "kishiwada-ichimonji"],
  [/尼崎.*(魚つり|魚釣り|釣り公園)|魚つり公園/, "amagasaki-uotsuri-koen"],
  [/南港魚つり園|南港魚釣り園/, "nanko-uotsuri-en"],
  [/平磯/, "hiraiso-umizuri-koen"],
  [/須磨海づり|須磨海釣り|須磨の海づり/, "suma-umizuri-koen"],
  [/マリーナシティ/, "marina-city-tsuri-koen"],
  [/とっとパーク/, "totto-park-kojima"],
  [/貝塚人工島|貝塚.*人工島/, "kaizuka-jinkoto"],
  [/夢舞大橋/, "yumemai-ohashi-shita"],
  [/舞洲/, "maishima-seaside-promenade"],
  [/汐見(埠頭|ふ頭)/, "shiomi-futo"],
  [/忠岡/, "tadaoka-suigintou"],
  [/鳴尾浜/, "naruohama-umizuri-hiroba"],
  [/海とのふれあい広場|堺.*釣りテラス/, "sakai-umizuri-terrace"],
  [/舞鶴親海公園/, "maizuru-shinkai-koen"],
];
export function matchPointPlace(place) {
  return POINT_PLACE_RULES.find(([re]) => re.test(place))?.[1] ?? null;
}

export function parsePointList(html) {
  const out = [];
  for (const m of html.matchAll(/<a href="\/fishing_infos\/(\d+)">([\s\S]*?)<\/a>/g)) {
    const id = m[1];
    const text = decodeEntities(stripTags(m[2]));
    const field = (name) => text.match(new RegExp(`【${name}】\\s*([^【]*)`))?.[1]?.replace(/\.\.\.$/, "").trim() ?? "";
    const dateRaw = field("日付").match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (!dateRaw) continue;
    const date = `${dateRaw[1]}-${dateRaw[2].padStart(2, "0")}-${dateRaw[3].padStart(2, "0")}`;
    const place = field("釣場");
    const spot = matchPointPlace(place);
    const species = findSpecies(field("釣魚"));
    if (!spot || !species.length) continue;
    // 釣り方の後ろに店員のコメントが続くため、最初の語（15文字まで）だけを使う
    const method = field("釣り方").replace(/&nbsp;|\u00a0/g, " ").trim().split(/\s+/)[0]?.replace(/\.{2,}$/, "").slice(0, 15) || null;
    species.forEach((sp, i) =>
      out.push({
        spot,
        id: `point-${id}${i ? `-${i}` : ""}`,
        date,
        species: sp,
        sizeCm: i === 0 ? parseMaxSizeCm(field("サイズ")) : null,
        count: null,
        method,
        time: null,
        url: `https://www.point-i.jp/fishing_infos/${id}`,
      }),
    );
  }
  return out;
}
