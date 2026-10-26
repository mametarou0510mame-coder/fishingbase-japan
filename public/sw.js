// ツレドキ関西のサービスワーカー（ホーム画面から開いたときのため）。
// 方針：いつもネットから最新を取りに行き、つながらないときだけ前に見たページ・データを出す（潮見表を防波堤の電波の弱い所でも見られるように）。
// 個人情報は扱わない。保存するのはこのサイトのページと公開データだけ。
const CACHE = "tsuredoki-v2";
const LIMIT = 80;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/app/", "/shio/"]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - LIMIT; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  const keep = req.mode === "navigate" || url.pathname.startsWith("/data/") || url.pathname.startsWith("/app-data/") || url.pathname.startsWith("/_next/static/");
  if (!keep) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).then(() => trim(c)));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((r) => r || caches.match(url.pathname.startsWith("/app") ? "/app/" : "/shio/") || Response.error())),
  );
});
