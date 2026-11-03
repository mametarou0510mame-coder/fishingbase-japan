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
export function amazonSearchUrl(keyword: string): string | null {
  if (!AMAZON_ON) return null;
  const m = MOSHIMO_AMAZON;
  const target = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  return `https://af.moshimo.com/af/c/click?a_id=${m.a_id}&p_id=${m.p_id}&pc_id=${m.pc_id}&pl_id=${m.pl_id}&url=${encodeURIComponent(target)}`;
}

// 広告表示の文言（参加しているプログラムに合わせる）
export const AFF_SHOPS = AMAZON_TAG ? "楽天市場・Amazon" : "楽天市場";
