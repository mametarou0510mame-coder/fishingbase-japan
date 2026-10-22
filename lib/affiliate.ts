// アフィリエイトリンクの生成。IDはリンクに必ず載る公開情報（秘密情報ではない）。
// 楽天アフィリエイト（2026-10-18 オーナー登録）
const RAKUTEN_AFFILIATE_ID = "5898e85a.312d89ad.5898e85b.c7f5d2cd";

// 楽天市場の検索結果ページへのアフィリエイトリンク
export function rakutenSearchUrl(keyword: string) {
  const target = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(target)}&m=${encodeURIComponent(target)}`;
}

// Amazonアソシエイト（オーナー登録後にトラッキングID（例: xxxx-22）を入れる。空の間は Amazon のリンクを出さない）
export const AMAZON_TAG = "";

// Amazon の検索結果ページへのアソシエイトリンク
export function amazonSearchUrl(keyword: string): string | null {
  if (!AMAZON_TAG) return null;
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${encodeURIComponent(AMAZON_TAG)}`;
}

// 広告表示の文言（参加しているプログラムに合わせる）
export const AFF_SHOPS = AMAZON_TAG ? "楽天市場・Amazon" : "楽天市場";
