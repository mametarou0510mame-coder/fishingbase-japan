// 楽天市場商品検索APIで、釣り道具のポイントアップ中の人気商品を取得し public/data/deals.json に保存する。
// キーはGitHubのシークレット（RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY）から読む。未設定なら何もしない。
// 表示時は「Supported by Rakuten Developers」のクレジットと PR 表記を付ける。
import { mkdir, writeFile } from "node:fs/promises";

const APP_ID = process.env.RAKUTEN_APP_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const AFFILIATE_ID = "5898e85a.312d89ad.5898e85b.c7f5d2cd";
const ORIGIN = "https://tsuredoki-kansai.mametarou0510mame.workers.dev";
const ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

const CATEGORIES = [
  { key: "sabiki", label: "サビキ釣りセット", keyword: "サビキ セット 竿 リール" },
  { key: "lifejacket", label: "ライフジャケット（桜マーク）", keyword: "ライフジャケット 桜マーク 釣り" },
  { key: "cooler", label: "クーラーボックス", keyword: "クーラーボックス 釣り" },
  { key: "tachiuo", label: "タチウオ仕掛け", keyword: "タチウオ 仕掛け" },
  { key: "rig", label: "サビキ仕掛け", keyword: "サビキ 仕掛け" },
];

if (!APP_ID || !ACCESS_KEY) {
  console.log("[deals] RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定のため取得しません");
  process.exit(0);
}

const out = { updatedOn: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), categories: [] };
for (const c of CATEGORIES) {
  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,
    affiliateId: AFFILIATE_ID,
    format: "json",
    formatVersion: "2",
    keyword: c.keyword,
    hits: "6",
    sort: "-reviewCount",
    availability: "1",
    pointRateFlag: "1", // ポイント2倍以上の商品だけ
    imageFlag: "1",
  });
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { headers: { Origin: ORIGIN } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    const items = (json.Items ?? []).map((it) => {
      const i = it.Item ?? it;
      return {
        name: String(i.itemName ?? "").slice(0, 80),
        price: i.itemPrice ?? null,
        url: i.affiliateUrl || i.itemUrl,
        image: (i.mediumImageUrls?.[0]?.imageUrl ?? i.mediumImageUrls?.[0] ?? "").replace(/\?_ex=\d+x\d+/, "?_ex=200x200"),
        shop: i.shopName ?? "",
        pointRate: i.pointRate ?? 1,
        pointEnd: i.pointRateEndTime ?? "",
        review: i.reviewAverage ?? null,
        reviewCount: i.reviewCount ?? 0,
      };
    });
    out.categories.push({ key: c.key, label: c.label, items });
    console.log(`[deals] ${c.key}: ${items.length}`);
  } catch (e) {
    console.warn(`[deals] ${c.key}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 1200)); // 1秒に1回まで
}

if (out.categories.length === 0) {
  console.warn("[deals] 1件も取得できなかったため、前回のデータを残します");
  process.exit(0);
}
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/deals.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
