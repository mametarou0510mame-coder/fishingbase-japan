// 検索エンジン（Bing など IndexNow 対応のもの）に、サイトの更新を知らせる。
// キーは public/fa48bfc9ee8d948e71d0f95482ed9020.txt に置いてある（公開してよい値）。
const KEY = "fa48bfc9ee8d948e71d0f95482ed9020";
const HOST = "tsuredoki-kansai.mametarou0510mame.workers.dev";
const res = await fetch(`https://${HOST}/sitemap.xml`);
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 10000);
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URLs → HTTP ${r.status}`);
if (r.status >= 400) process.exitCode = 1;
