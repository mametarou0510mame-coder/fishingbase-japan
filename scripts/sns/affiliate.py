# アフィリエイトリンク（lib/affiliate.ts と同じ形）。ID はリンクに載る公開情報。
import urllib.parse

RAKUTEN_AFFILIATE_ID = "5898e85a.312d89ad.5898e85b.c7f5d2cd"


def rakuten_search_url(keyword, short=True):
    """short=True は概要欄用の短い形（検索語を二重にエンコードせず、スマホ用の m= も付けない）"""
    if short:
        target = f"https://search.rakuten.co.jp/search/mall/{keyword.replace(' ', '+')}/"
        return f"https://hb.afl.rakuten.co.jp/hgc/{RAKUTEN_AFFILIATE_ID}/?pc={urllib.parse.quote(target, safe=':/+')}"
    target = f"https://search.rakuten.co.jp/search/mall/{urllib.parse.quote(keyword)}/"
    q = urllib.parse.quote(target, safe="")
    return f"https://hb.afl.rakuten.co.jp/hgc/{RAKUTEN_AFFILIATE_ID}/?pc={q}&m={q}"


def tackle_lines(guides, limit=6):
    """ガイドの初級の道具を重複なしで、楽天市場の検索リンクつきの行にする"""
    out, seen = [], set()
    for g in guides:
        for it in g["tackle"][0]["items"]:
            if it["name"] in seen or not it.get("keyword"):
                continue
            seen.add(it["name"])
            amz = amazon_search_url(it["keyword"])
            out.append(f"・{it['name']}（{it['spec']}）\n楽天 {rakuten_search_url(it['keyword'])}" + (f"\nAmazon {amz}" if amz else ""))
            if len(out) >= limit:
                return out
    return out


# Amazonアソシエイト（lib/affiliate.ts の AMAZON_TAG と同じ値。空の間は Amazon のリンクを出さない）
AMAZON_TAG = ""


def amazon_search_url(keyword):
    if not AMAZON_TAG:
        return None
    return f"https://www.amazon.co.jp/s?k={urllib.parse.quote(keyword)}&tag={AMAZON_TAG}"
