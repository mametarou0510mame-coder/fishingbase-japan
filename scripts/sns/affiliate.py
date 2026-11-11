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
# 2026-11-11 からアソシエイト直接（トラッキングID。公開情報）。媒体ごとにIDを分けたら、ここだけ変える
AMAZON_ASSOCIATE_TAG = {"instagram": "tsuredoki-ig-22", "youtube": "tsuredoki-yt-22"}
AMAZON_TAG = ""  # 互換のため。サイトでの提携が承認されるまで空（空の間は Amazon のリンクを出さない）


# 製品ページ（dp/ASIN）が確かめられたものは、検索ではなく製品ページへ（リンクが半分くらいの長さになる）
# 2026-11-05 Amazon の検索結果で確かめた製品ページ。番手・重さ・カラーをページで選ぶ「各種」のページもある
# 25 カルディア LT4000-CXH とアシストフックは 2026-11-05 にオーナーが ASIN を指定
AMAZON_ASIN = {
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
    "シャウト ツインアシスト 43-TA": "B000AQZAYA",  # シャウト! 43-TA ツインアシスト
    # 2026-11-11 船のタチウオ（cg-fune-tachiuo）の固定コメント用。Amazon の製品ページを検索で確かめた
    "ダイワ 船タチウオテンヤSS 40号": "B0D22M6114",
    "シマノ サーベルマスター 船テンヤ": "B07TDRJ4PN",
    "ジャッカル アンチョビメタル タイプ1 160g": "B00ZQJ0J9W",
    "シマノ サーベルマスター エクスチューン テンヤ": "B0D9GTRVDR",
    "シマノ プレイズ 600": "B0DBH1JW2L",
    "ダイワ 23 レオブリッツ 200J": "B0C9M1763N",
    "シマノ 21 バルケッタ 300PG": "B09BFNX9H7",
    "ダイワ ライトゲームRX IC 200": "B0FWB5CM6C",
    "よつあみ スーパージグマンX8 2号 200m": "B07L5GP9F5",
}


def amazon_search_url(keyword, force=False, media="instagram"):
    """Amazonアソシエイト直接の Amazon リンク（製品ページ dp/ASIN か検索）。force=True は承認済みの媒体（media：instagram / youtube）用"""
    if not (AMAZON_TAG or force):
        return None
    asin = AMAZON_ASIN.get(keyword)
    if asin:
        return f"https://www.amazon.co.jp/dp/{asin}?tag={AMAZON_ASSOCIATE_TAG[media]}"
    return f"https://www.amazon.co.jp/s?k={urllib.parse.quote(keyword)}&tag={AMAZON_ASSOCIATE_TAG[media]}"
