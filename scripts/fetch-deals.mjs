// 楽天市場商品検索APIで、釣り道具のポイントアップ中の人気商品を取得し public/data/deals.json に保存する。
// キーはGitHubのシークレット（RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY）から読む。未設定なら何もしない。
// 表示時は「Supported by Rakuten Developers」のクレジットと PR 表記を付ける。
import { mkdir, writeFile } from "node:fs/promises";

const APP_ID = process.env.RAKUTEN_APP_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const AFFILIATE_ID = "5898e85a.312d89ad.5898e85b.c7f5d2cd";
const ORIGIN = "https://tsuredoki-kansai.mametarou0510mame.workers.dev";
const ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

const CATEGORIES = [
  { key: "sabiki", label: "サビキ釣りセット", keyword: "サビキ セット 竿 リール" },
  { key: "lifejacket", label: "ライフジャケット（桜マーク）", keyword: "ライフジャケット 桜マーク 釣り", mustInclude: "桜", fallbackLabel: "ライフジャケット" },
  { key: "cooler", label: "クーラーボックス", keyword: "クーラーボックス 釣り" },
  { key: "tachiuo", label: "タチウオ仕掛け", keyword: "タチウオ 仕掛け" },
  { key: "rig", label: "サビキ仕掛け", keyword: "サビキ 仕掛け" },
];

if (!APP_ID || !ACCESS_KEY) {
  console.log("::warning::[deals] RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定のため取得しません");
  process.exit(0);
}

const out = { updatedOn: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), categories: [] };
// 楽天アフィリエイトのリンク（動作確認済みの形式）。APIが返すリンクではなく、オーナーのIDで作る
const affiliateLink = (itemUrl) =>
  `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=${encodeURIComponent(itemUrl)}&m=${encodeURIComponent(itemUrl)}`;
// 商品名から【クーポン】などの宣伝文を除く
const cleanName = (n) => String(n ?? "").replace(/【[^】]*】|［[^］]*］|\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 70);

async function search(keyword, pointUp) {
  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,
    affiliateId: AFFILIATE_ID,
    format: "json",
    formatVersion: "2",
    keyword,
    hits: "6",
    sort: "-reviewCount",
    availability: "1",
    imageFlag: "1",
  });
  if (pointUp) params.set("pointRateFlag", "1"); // ポイント2倍以上の商品だけ
  const res = await fetch(`${ENDPOINT}?${params}`, { headers: { Origin: ORIGIN } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return (json.Items ?? []).map((it) => {
    const i = it.Item ?? it;
    const img = i.mediumImageUrls?.[0];
    return {
      name: cleanName(i.itemName),
      price: i.itemPrice ?? null,
      url: affiliateLink(String(i.itemUrl).trim()),
      image: String(img?.imageUrl ?? img ?? "").replace(/\?_ex=\d+x\d+/, "?_ex=200x200"),
      shop: i.shopName ?? "",
      pointRate: i.pointRate ?? 1,
      pointEnd: i.pointRateEndTime ?? "",
      review: i.reviewAverage ?? null,
      reviewCount: i.reviewCount ?? 0,
    };
  });
}

for (const c of CATEGORIES) {
  try {
    let items = await search(c.keyword, true);
    let kind = "point";
    if (items.length === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      items = await search(c.keyword, false);
      kind = "popular";
    }
    let label = c.label;
    let unverified = false;
    if (c.mustInclude) {
      const ok = items.filter((i) => i.name.includes(c.mustInclude));
      if (ok.length) items = ok;
      else {
        label = c.fallbackLabel;
        unverified = true;
      }
    }
    out.categories.push({ key: c.key, label, kind, unverified, items });
    console.log(`::notice::[deals] ${c.key}: ${items.length} (${kind})`);
  } catch (e) {
    console.log(`::warning::[deals] ${c.key}: ${String(e.message).replaceAll(APP_ID, "***").replaceAll(ACCESS_KEY, "***")}`);
  }
  await new Promise((r) => setTimeout(r, 1200)); // 1秒に1回まで
}

if (out.categories.length === 0) {
  console.log("::warning::[deals] 1件も取得できなかったため、前回のデータを残します");
  process.exit(0);
}
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/deals.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
