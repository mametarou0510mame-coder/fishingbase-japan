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


def tackle_lines(guides, limit=6, amazon=False, media="instagram"):
    """ガイドの初級の道具を重複なしで、楽天市場の検索リンクつきの行にする
    amazon：Amazon のリンクも付けるか。もしもアフィリエイトの Amazon は媒体ごとの提携（a_id が媒体ごとにちがう）"""
    out, seen = [], set()
    for g in guides:
        for it in g["tackle"][0]["items"]:
            if it["name"] in seen or not it.get("keyword"):
                continue
            seen.add(it["name"])
            amz = amazon_search_url(it["keyword"], force=True, media=media) if amazon else None
            out.append(f"・{it['name']}（{it['spec']}）\n楽天 {rakuten_search_url(it['keyword'])}" + (f"\nAmazon {amz}" if amz else ""))
            if len(out) >= limit:
                return out
    return out


# Amazon（もしもアフィリエイト経由）。a_id は媒体ごと：Instagram 5858728（11/2 承認）、YouTube 5877693（11/4 承認）、
# サイトは lib/affiliate.ts のホームページ用 5873643（11/3 承認）
MOSHIMO_AMAZON = {"a_id": "5858728", "p_id": "170", "pc_id": "185", "pl_id": "4062"}
MOSHIMO_A_ID = {"instagram": "5858728", "youtube": "5877693"}
AMAZON_TAG = ""  # 互換のため。サイトでの提携が承認されるまで空（空の間は Amazon のリンクを出さない）


def amazon_search_url(keyword, force=False, media="instagram"):
    """もしもの「どこでもリンク」形式の Amazon 検索リンク。force=True は承認済みの媒体（media：instagram / youtube）用"""
    if not (AMAZON_TAG or force):
        return None
    m = dict(MOSHIMO_AMAZON, a_id=MOSHIMO_A_ID[media])
    target = f"https://www.amazon.co.jp/s?k={urllib.parse.quote(keyword)}"
    return f"https://af.moshimo.com/af/c/click?a_id={m['a_id']}&p_id={m['p_id']}&pc_id={m['pc_id']}&pl_id={m['pl_id']}&url={urllib.parse.quote(target, safe='')}"
