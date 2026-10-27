// 地図ページ用のデータを作る（GitHub Actions で実行）。
//  1) 釣り場の住所を国土地理院の住所検索で緯度経度に変える → lib/spotCoords.json（取得済みは再利用）
//  2) Natural Earth（パブリックドメイン）の海岸線から関西部分を切り出す → lib/kansaiMap.json
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { feature } from "topojson-client";

const tmp = mkdtempSync(join(tmpdir(), "spots-"));
// spots.ts は "@/lib/prefs" を読むので、同じ場所に置いて読み込み先を書き換える
writeFileSync(join(tmp, "spots.mts"), readFileSync("lib/spots.ts", "utf8").replace(/"@\/lib\/prefs"/g, '"./prefs.mts"'));
copyFileSync("lib/prefs.ts", join(tmp, "prefs.mts"));
const { SPOTS, PREF_LABEL } = await import(join(tmp, "spots.mts"));

// 1) 住所 → 緯度経度
const COORDS = "lib/spotCoords.json";
const coords = existsSync(COORDS) ? JSON.parse(readFileSync(COORDS, "utf8")) : {};
const clean = (a) => a.replace(/（.*?）|\(.*?\)/g, "").replace(/地先|先$/g, "").replace(/\s+/g, "");
for (const s of SPOTS) {
  if (coords[s.slug]?.manual || coords[s.slug]?.address === s.address) continue; // manual は手で直した位置（沖堤防など）
  const tries = [clean(s.address), clean(s.address).replace(/[0-9０-９\-－丁目番地号]+$/u, ""), `${s.area}`];
  let hit = null;
  for (const q of tries) {
    const r = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`);
    const j = r.ok ? await r.json() : [];
    if (j.length) { hit = { q, j: j[0] }; break; }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  if (!hit) { console.log(`::warning::${s.slug}: 位置が見つかりません（${s.address}）`); continue; }
  const [lon, lat] = hit.j.geometry.coordinates;
  const kansai = ["osaka", "hyogo", "kyoto", "wakayama"].includes(s.pref);
  const out = kansai ? lon < 134 || lon > 136.3 || lat < 33.3 || lat > 35.9 : lon < 122 || lon > 154 || lat < 20 || lat > 46;
  if (out || !String(hit.j.properties.title).startsWith(PREF_LABEL[s.pref] ?? "")) { console.log(`::warning::${s.slug}: ${PREF_LABEL[s.pref]}の外の位置になりました（${hit.j.properties.title}）。lib/spotCoords.json に manual で位置を入れてください`); continue; }
  coords[s.slug] = { lat: +lat.toFixed(4), lon: +lon.toFixed(4), address: s.address, matched: hit.j.properties.title, rough: hit.q !== tries[0] };
  console.log(`${s.slug}: ${lat},${lon} (${hit.j.properties.title})`);
  await new Promise((ok) => setTimeout(ok, 500));
}
writeFileSync(COORDS, JSON.stringify(coords, null, 1) + "\n");

// 2) 海岸線（関西全体と、大阪湾まわりの拡大の2枚）
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-10m.json", "utf8"));
const jp = feature(topo, topo.objects.countries).features.find((f) => f.id === "392");
const polys = jp.geometry.type === "MultiPolygon" ? jp.geometry.coordinates : [jp.geometry.coordinates];
const C = Math.cos((34.6 * Math.PI) / 180);

function view(LON0, LON1, LAT0, LAT1, K) {
  const W = Math.round((LON1 - LON0) * C * K), H = Math.round((LAT1 - LAT0) * K);
  const proj = ([lon, lat]) => [(lon - LON0) * C * K, (LAT1 - lat) * K];
  // 長方形で多角形を切り取る（Sutherland–Hodgman）
  const m = 10;
  const inside = [(p) => p[0] >= -m, (p) => p[0] <= W + m, (p) => p[1] >= -m, (p) => p[1] <= H + m];
  const cut = [
    (a, b) => { const t = (-m - a[0]) / (b[0] - a[0]); return [-m, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (W + m - a[0]) / (b[0] - a[0]); return [W + m, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (-m - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), -m]; },
    (a, b) => { const t = (H + m - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), H + m]; },
  ];
  const clip = (ring) => {
    let out = ring;
    for (let e = 0; e < 4 && out.length; e++) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        if (inside[e](b)) { if (!inside[e](a)) out.push(cut[e](a, b)); out.push(b); }
        else if (inside[e](a)) out.push(cut[e](a, b));
      }
    }
    return out;
  };
  let d = "";
  for (const poly of polys) {
    const ring = clip(poly[0].map(proj));
    const pts = [];
    for (const p of ring) {
      const q = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= 1.2) pts.push(q);
    }
    if (pts.length >= 3) d += "M" + pts.map((p) => `${p[0]} ${p[1]}`).join("L") + "Z";
  }
  console.log(`view ${W}x${H}, ${d.length} chars`);
  return { w: W, h: H, lon0: LON0, lat1: LAT1, k: K, c: C, bbox: [LON0, LAT0, LON1, LAT1], path: d };
}
writeFileSync("lib/kansaiMap.json", JSON.stringify({
  credit: "海岸線：Natural Earth",
  kansai: view(134.15, 136.15, 33.35, 35.85, 320),
  bay: view(134.95, 135.5, 34.15, 34.75, 1300),
  wide: view(134.6, 135.55, 34.05, 34.8, 1000), // 淡路島・和歌山まで入る大阪湾（動画用）
}) + "\n");
