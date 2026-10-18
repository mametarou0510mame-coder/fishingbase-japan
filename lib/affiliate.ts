// アフィリエイトリンクの生成。IDはリンクに必ず載る公開情報（秘密情報ではない）。
// 楽天アフィリエイト（2026-10-18 オーナー登録）
const RAKUTEN_AFFILIATE_ID = "5898e85a.312d89ad.5898e85b.c7f5d2cd";

// 楽天市場の検索結果ページへのアフィリエイトリンク
export function rakutenSearchUrl(keyword: string) {
  const target = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(target)}&m=${encodeURIComponent(target)}`;
}
