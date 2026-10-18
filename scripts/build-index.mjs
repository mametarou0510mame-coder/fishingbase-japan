// 釣れ指数を計算して public/data/index.json に保存する。
//
// 考え方（釣り場 s・魚種 f ごと）
//   「釣果の記事が出た日（活動日）のうち、その魚が報告された日の割合」を基本にする。
//   年ごとの投稿数の増減に左右されにくくするため、件数ではなく割合を使う。
//   1. 季節 p(w): 同じ時期（前後2週間）の割合。件数が少ない時期は年間平均に寄せる（ベイズ平滑化）。
//   2. 潮 L(c): その日の干満差を地点・年ごとに大/中/小に分け、潮の大きさ別の割合を年間平均と比べた倍率。
//   3. 最近 R: 直近14日の割合を季節の値と比べた倍率。
//   釣れ指数 = p(w) × L(c) × R を % にしたもの（釣果が出た日に、その魚が報告される見込み）。
//   魚種どうしで比べられるよう、魚種ごとの最大値で割らずにそのまま使う。
//   あわせて季節の段階（最盛期／シーズン中／シーズン外）を p(w) と年間最大の比で示す。
import { readFile, writeFile, readdir } from "node:fs/promises";

const HIST = new URL("../data/history/", import.meta.url);
const PUB = new URL("../public/data/", import.meta.url);
const SPOTS = {
  "kishiwada-ichimonji": { tide: "J2" },
  "hiraiso-umizuri-koen": { tide: "AK" },
};
const ALPHA = 10; // 季節の平滑化の強さ
const BETA = 30; // 潮の倍率の平滑化の強さ
const GAMMA = 7; // 最近の傾向の平滑化の強さ
const MIN_POSTS = 15; // 指数を出す最低限の報告数
const EXCLUDE = new Set(["青物（種類不明）"]);

const readJson = async (url, fb) => {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return fb;
  }
};

const jstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const week = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.min(51, Math.floor((d.getTime() - start) / 86400000 / 7));
};
const clip = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// 地点・年ごとの干満差の三分位で潮の大きさを分類
function tideClassifier(ranges) {
  const byYear = {};
  for (const [d, r] of Object.entries(ranges)) (byYear[d.slice(0, 4)] ??= []).push(r);
  const cut = {};
  for (const [y, arr] of Object.entries(byYear)) {
    arr.sort((a, b) => a - b);
    cut[y] = [arr[Math.floor(arr.length / 3)], arr[Math.floor((arr.length * 2) / 3)]];
  }
  return (date) => {
    const r = ranges[date];
    const c = cut[date.slice(0, 4)];
    if (r === undefined || !c) return null;
    return r >= c[1] ? "大" : r <= c[0] ? "小" : "中";
  };
}

async function tideRanges(code) {
  const ranges = { ...(await readJson(new URL(`tides-${code}.json`, HIST), { ranges: {} })).ranges };
  // 今年・来年分は公開用の潮位表から
  for (const f of await readdir(new URL("tides/", PUB)).catch(() => [])) {
    if (!f.startsWith(`${code}-`)) continue;
    const t = await readJson(new URL(`tides/${f}`, PUB), { days: [] });
    for (const d of t.days) {
      const v = d.hourly.filter((x) => x !== null);
      if (v.length) ranges[d.date] = Math.max(...v) - Math.min(...v);
    }
  }
  return ranges;
}

const catches = await readJson(new URL("catches.json", PUB), { reports: [] });
const today = jstToday();
const out = { generatedOn: today, method: "季節×潮×最近の傾向（過去の公開釣果から算出）", spots: {} };

for (const [slug, cfg] of Object.entries(SPOTS)) {
  const hist = await readJson(new URL(`${slug}.json`, HIST), null);
  if (!hist || Object.keys(hist.days).length < 100) {
    console.log(`[index] ${slug}: 過去データ不足のためスキップ`);
    continue;
  }
  const days = structuredClone(hist.days);
  // 過去データより新しい日は、毎日の釣果データで補う
  const newest = Object.keys(days).sort().at(-1);
  const posts = new Map();
  for (const r of catches.reports.filter((r) => r.spot === slug && r.date > newest)) {
    const key = `${r.date}|${r.id.replace(/#\d+$/, "")}`;
    const p = posts.get(key) ?? { date: r.date, s: new Set() };
    p.s.add(r.species);
    posts.set(key, p);
  }
  for (const p of posts.values()) {
    const d = (days[p.date] ??= { n: 0, s: {}, t: {} });
    d.n += 1;
    for (const sp of p.s) d.s[sp] = (d.s[sp] ?? 0) + 1;
  }

  const active = Object.keys(days).filter((d) => days[d].n > 0).sort();
  const classify = tideClassifier(await tideRanges(cfg.tide));
  const totals = {};
  for (const d of active) for (const sp of Object.keys(days[d].s)) totals[sp] = (totals[sp] ?? 0) + 1;
  const speciesList = Object.keys(totals).filter((sp) => totals[sp] >= MIN_POSTS && !EXCLUDE.has(sp));

  // 週ごとの活動日数
  const weekDays = Array(52).fill(0);
  for (const d of active) weekDays[week(d)] += 1;

  const model = {};
  for (const sp of speciesList) {
    const pBar = totals[sp] / active.length;
    const weekHits = Array(52).fill(0);
    const tideHit = { 大: 0, 中: 0, 小: 0 };
    const tideDen = { 大: 0, 中: 0, 小: 0 };
    for (const d of active) {
      const y = days[d].s[sp] ? 1 : 0;
      weekHits[week(d)] += y;
      const c = classify(d);
      if (c) {
        tideDen[c] += 1;
        tideHit[c] += y;
      }
    }
    const season = Array.from({ length: 52 }, (_, w) => {
      let num = 0;
      let den = 0;
      for (let k = -2; k <= 2; k++) {
        const ww = (w + k + 52) % 52;
        num += weekHits[ww];
        den += weekDays[ww];
      }
      return (num + ALPHA * pBar) / (den + ALPHA);
    });
    const lift = {};
    for (const c of ["大", "中", "小"]) lift[c] = clip((tideHit[c] + BETA * pBar) / (tideDen[c] + BETA) / pBar, 0.75, 1.33);
    model[sp] = { pBar, season, lift };
  }

  // 直近14日の傾向
  const recentFrom = addDays(today, -13);
  const recentActive = active.filter((d) => d >= recentFrom && d <= today);
  const result = { coverage: { from: active[0], to: active.at(-1), activeDays: active.length }, days: [], species: {} };

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const c = classify(date);
    const scores = speciesList.map((sp) => {
      const m = model[sp];
      const pw = m.season[week(date)];
      const hits = recentActive.filter((d) => days[d].s[sp]).length;
      const R = clip((hits + GAMMA * pw) / (recentActive.length + GAMMA) / pw, 0.6, 1.6);
      const L = c ? m.lift[c] : 1;
      const ratio = pw / Math.max(...m.season);
      const stage = ratio >= 0.8 ? "最盛期" : ratio >= 0.4 ? "シーズン中" : "シーズン外";
      return { species: sp, index: Math.round(clip(100 * pw * L * R, 0, 100)), stage };
    });
    scores.sort((a, b) => b.index - a.index);
    result.days.push({ date, tideClass: c, top: scores.slice(0, 6) });
  }

  for (const sp of speciesList) {
    const s = model[sp].season;
    const best = s.map((v, w) => [v, w]).sort((a, b) => b[0] - a[0]).slice(0, 6).map(([, w]) => w).sort((a, b) => a - b);
    result.species[sp] = {
      reports: totals[sp],
      bestWeeks: best,
      tideLift: model[sp].lift,
    };
  }
  out.spots[slug] = result;
  console.log(`[index] ${slug}: ${speciesList.length}魚種・活動日${active.length}日（${active[0]}〜${active.at(-1)}）`);
}

await writeFile(new URL("index.json", PUB), JSON.stringify(out, null, 1) + "\n");
