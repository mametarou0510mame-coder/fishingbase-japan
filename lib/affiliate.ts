// アフィリエイトリンクの生成。IDはリンクに必ず載る公開情報（秘密情報ではない）。
// 楽天アフィリエイト（2026-10-18 オーナー登録）
const RAKUTEN_AFFILIATE_ID = "5898e85a.312d89ad.5898e85b.c7f5d2cd";

// 楽天市場の検索結果ページへのアフィリエイトリンク
export function rakutenSearchUrl(keyword: string) {
  const target = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(target)}&m=${encodeURIComponent(target)}`;
}

// Amazon（もしもアフィリエイト経由。Instagram 2026-11-02・ホームページ 2026-11-03 承認、YouTube は否認）
// a_id 等はリンクに必ず載る公開情報。AMAZON_ON は、この媒体（サイト）での提携が承認されてから true にする
// a_id は媒体ごと：ホームページ 5873643（2026-11-03 承認）／Instagram 5858728。サイトではホームページ用を使う
export const MOSHIMO_AMAZON = { a_id: "5873643", p_id: "170", pc_id: "185", pl_id: "4062" };
export const AMAZON_ON = true;
export const AMAZON_TAG = AMAZON_ON ? "moshimo" : ""; // 互換のため（空の間は Amazon のリンクを出さない）

// Amazon の検索結果ページへのリンク（もしもの「どこでもリンク」と同じ形）
// 製品ページ（dp/ASIN）が分かるものは検索ではなく製品ページへ（scripts/sns/affiliate.py の AMAZON_ASIN と同じ）
export const AMAZON_ASIN: Record<string, string> = {
  "ダイワ ショアジギングX 96M": "B09SG5ZZ1V",
  "メジャークラフト クロスライド XR3-962M": "B0FF8NXZRR",
  "シマノ ナスキー C5000XG": "B0G4LYCZ58",
  "ダイワ レガリス LT4000-CXH": "B0CCRB536X",
  "シマノ コルトスナイパーBB S96M": "B08ZSWCG84",
  "ダイワ ドラッガーMX 96M": "B0F24F98KD",
  "シマノ ストラディック C5000XG": "B0CGCTHF1T",
  "シマノ コルトスナイパーSS S96M": "B0CS638PVH",
  "シマノ ツインパワーSW 4000XG": "B08ZNS1KDB",
  "よつあみ アップグレードX8 1.5号": "B085J2FG14",
  "シーガー PE X8 1.5号": "B0DPCYPJKZ",
  "バリバス ショックリーダー フロロカーボン 8号": "B07L5W2JLB",
  "ジグパラ 40g": "B0GGMHDQ3Q",
  "ダイワ サムライジグR 40g": "B0BVRPZ6KQ",
  "ジャッカル ビッグバッカージグ 40g": "B07YN8289M",
  "撃投ジグ レベル 40g": "B0055A3IYK",
  "ジャックアイ マキマキ サゴシスペシャル": "B09Z1LCYNS",
  "ダイワ TGベイト 45g": "B003VCL6BG",
  "ムーチョルチア 35g": "B06W9JBZ55",
  "ライフジャケット 桜マーク タイプA": "B09WV3NF12",
  "メジャークラフト ランディングセット 500": "B0BDRL3VFK",
  "スミス イージーフィッシュグリップ22": "B085C8WL33",
  "スミス ロングフォーセップ 250mm": "B00IM3BI2Q",
  "ダイワ カルディア LT4000-CXH": "B0DTYKNCLL",
  "シャウト ツインアシスト 43-TA": "B000AQZAYA",  // シャウト! 43-TA ツインアシスト
};

export function amazonSearchUrl(keyword: string): string | null {
  if (!AMAZON_ON) return null;
  const m = MOSHIMO_AMAZON;
  const asin = AMAZON_ASIN[keyword];
  const target = asin ? `https://www.amazon.co.jp/dp/${asin}` : `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  return `https://af.moshimo.com/af/c/click?a_id=${m.a_id}&p_id=${m.p_id}&pc_id=${m.pc_id}&pl_id=${m.pl_id}&url=${encodeURIComponent(target)}`;
}

// 広告表示の文言（参加しているプログラムに合わせる）
export const AFF_SHOPS = AMAZON_TAG ? "楽天市場・Amazon" : "楽天市場";
