# Instagram：ショアジギングのおすすめ道具のカルーセル（1080x1350、8枚）【PR】
#   python scripts/sns/gear_carousel.py make <outdir>
# 中身は scripts/cg/make_gear.py（動画）と lib/gearShoreJigging.ts（サイト）と同じ。価格は書かない。
# 絵は 3DCG 動画の場面（content/sns/gear-sj/）。リンクはキャプションに書いても押せないので「プロフィールのリンクから」
import json
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from draw import FONT_BLACK, FONT_BOLD, NAVY, RED, WHITE, font, logo  # noqa: E402

W, H = 1080, 1350
A = "content/sns/gear-sj"
INK = (20, 40, 64)
SUB = (80, 100, 118)
PAPER = (246, 249, 252)
TIER = [("初級", (42, 157, 92), "最初の1セットに"), ("中級", (31, 111, 209), "軽さと強さを上げたい人に"), ("上級", (194, 65, 12), "ブリ級も見すえて、長く使いたい人に")]
_f = {}


def F(p, s):
    if (p, s) not in _f:
        _f[(p, s)] = font(p, s)
    return _f[(p, s)]


def sets():
    sys.path.insert(0, "scripts/cg")
    import importlib.util
    sp = importlib.util.spec_from_file_location("mg", "scripts/cg/make_gear.py")
    mg = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(mg)
    return mg.SETS


def canvas():
    im = Image.new("RGB", (W, H), PAPER)
    return im, ImageDraw.Draw(im)


def hero(im, path, h, crop=None):
    src = Image.open(path).convert("RGB")
    if crop:
        src = src.crop(crop)
    r = W / src.width
    src = src.resize((W, int(src.height * r)), Image.LANCZOS)
    top = max(0, (src.height - h) // 2)
    im.paste(src.crop((0, top, W, top + h)), (0, 0))


def pr(d, x=W - 150, y=60):
    d.rounded_rectangle((x, y, x + 96, y + 54), radius=12, fill=RED)
    d.text((x + 48, y + 27), "PR", font=F(FONT_BLACK, 32), fill=WHITE, anchor="mm")


def foot(d, text="リンクはプロフィールから"):
    d.rectangle((0, H - 100, W, H), fill=NAVY)
    logo(d, 56, H - 80, 54)
    d.text((W - 56, H - 50), text, font=F(FONT_BOLD, 34), fill=WHITE, anchor="rm")


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=f) > maxw and cur:
            out.append(cur)
            cur = ch
        else:
            cur += ch
    return out + ([cur] if cur else [])


def lines(d, x, y, text, f, fill, maxw, gap=10):
    for ln in wrap(d, text, f, maxw):
        d.text((x, y), ln, font=f, fill=fill)
        y += f.size + gap
    return y


def slide_cover():
    im, d = canvas()
    hero(im, f"{A}/hero-tackle.jpg", 610, crop=(300, 0, 1920, 1080))
    pr(d, x=60)
    y = 650
    d.text((60, y), "ショアジギング", font=F(FONT_BLACK, 92), fill=NAVY)
    d.text((60, y + 112), "おすすめタックルセット", font=F(FONT_BLACK, 84), fill=RED)
    x = 60
    for name, col, _ in TIER:
        d.rounded_rectangle((x, y + 240, x + 190, y + 330), radius=20, fill=col)
        d.text((x + 95, y + 285), name, font=F(FONT_BLACK, 56), fill=WHITE, anchor="mm")
        x += 215
    d.text((60, y + 370), "＋ジグ・ラインの選び方／あると便利な道具", font=F(FONT_BOLD, 38), fill=SUB)
    d.text((60, y + 430), "関西の堤防・沖堤防で40g前後のジグを投げる人向け", font=F(FONT_BOLD, 32), fill=SUB)
    foot(d, "保存してね")
    return im


def slide_rule():
    im, d = canvas()
    hero(im, f"{A}/gear.jpg", 430, crop=(0, 120, 1920, 1000))
    pr(d)
    y = 470
    d.text((60, y), "選び方の目安", font=F(FONT_BLACK, 70), fill=NAVY)
    y += 110
    for head, rows in [("ロッド", ["長さ 9.6フィート（約2.9m）前後", "硬さ ML〜M・ジグ上限50〜60g", "重さ 250g前後まで"]), ("リール", ["4000番〜C5000番", "ハイギア（XG・XH）＝早巻きしやすい", "軽さ・海水への強さ・ドラグ"])]:
        d.rounded_rectangle((60, y, 230, y + 60), radius=14, fill=RED)
        d.text((145, y + 30), head, font=F(FONT_BLACK, 38), fill=WHITE, anchor="mm")
        for i, r in enumerate(rows):
            d.text((260, y + 6 + i * 58), r, font=F(FONT_BOLD, 38), fill=INK)
        y += 3 * 58 + 40
    foot(d)
    return im


def slide_set(st):
    name, col, who = TIER[st["tier"]]
    im, d = canvas()
    d.rectangle((0, 0, W, 210), fill=col)
    d.text((60, 52), f"{name}セット", font=F(FONT_BLACK, 84), fill=WHITE)
    d.text((62, 150), who, font=F(FONT_BOLD, 36), fill=WHITE)
    pr(d, y=70)
    y = 260
    for s in st["sets"]:
        box_top = y
        y += 30
        d.text((90, y), s["label"], font=F(FONT_BLACK, 36), fill=col)
        y += 62
        for kind, nm, spec in [("ロッド", s["rod"], s["rodSpec"]), ("リール", s["reel"], s["reelSpec"])]:
            d.text((90, y), kind, font=F(FONT_BOLD, 30), fill=SUB)
            y = lines(d, 90, y + 40, nm, F(FONT_BLACK, 44), INK, W - 200, 6)
            y = lines(d, 90, y + 2, spec, F(FONT_BOLD, 30), SUB, W - 200, 6) + 22
        d.rounded_rectangle((60, box_top, W - 60, y + 6), radius=24, outline=col, width=5)
        d.rectangle((60, box_top + 24, 74, y - 18), fill=col)
        y += 40
    foot(d)
    return im


def slide_jig():
    im, d = canvas()
    hero(im, f"{A}/hero-jig.jpg", 470, crop=(240, 60, 1680, 1000))
    pr(d)
    y = 510
    d.text((60, y), "ジグ・ラインの選び方", font=F(FONT_BLACK, 66), fill=NAVY)
    y += 104
    for a, b in [("センターバランス", "ひらひら・ゆっくり落ちる（ジグパラ）"), ("リアバランス", "まっすぐ速く沈む・よく飛ぶ（ビッグバッカージグ）"), ("タングステン", "同じ重さで体積は約6割（TGベイト）"), ("サゴシ対策", "ワイヤー入りブレード（ジャックアイ マキマキ）"), ("ライン", "PE1.2〜1.5号＋フロロのリーダー6〜8号")]:
        d.text((60, y), a, font=F(FONT_BLACK, 38), fill=RED)
        y = lines(d, 60, y + 50, b, F(FONT_BOLD, 34), INK, W - 120, 6) + 18
    foot(d)
    return im


def slide_goods():
    im, d = canvas()
    hero(im, f"{A}/hero-tamo.jpg", 470, crop=(200, 100, 1600, 1000))
    pr(d)
    y = 510
    d.text((60, y), "あると便利な道具5つ", font=F(FONT_BLACK, 66), fill=NAVY)
    y += 110
    for i, (a, b) in enumerate([("ライフジャケット", "桜マーク付き・タイプA"), ("タモ網", "長さ5m前後・枠55〜60cm"), ("フィッシュグリップ", "暴れる魚の口をはさむ"), ("ロングフォーセップ", "手を近づけずに針を外す"), ("予備のアシストフック", "交換用を多めに・スナップも")]):
        d.ellipse((60, y, 124, y + 64), fill=RED)
        d.text((92, y + 32), str(i + 1), font=F(FONT_BLACK, 36), fill=WHITE, anchor="mm")
        d.text((150, y + 2), a, font=F(FONT_BLACK, 40), fill=INK)
        d.text((150, y + 54), b, font=F(FONT_BOLD, 30), fill=SUB)
        y += 120
    foot(d)
    return im


def slide_cta():
    im, d = canvas()
    im.paste(NAVY, (0, 0, W, H))
    pr(d)
    d.text((W // 2, 300), "紹介した道具のリンクは", font=F(FONT_BLACK, 62), fill=WHITE, anchor="mm")
    d.text((W // 2, 400), "プロフィールのリンクから", font=F(FONT_BLACK, 70), fill=(255, 209, 102), anchor="mm")
    d.rounded_rectangle((140, 500, W - 140, 640), radius=30, fill=WHITE)
    d.text((W // 2, 570), "サイト「おすすめ道具」", font=F(FONT_BLACK, 56), fill=NAVY, anchor="mm")
    d.text((W // 2, 720), "楽天市場・Amazon で探せます", font=F(FONT_BOLD, 42), fill=WHITE, anchor="mm")
    d.text((W // 2, 800), "動きのくわしい解説は YouTube（3DCG）で", font=F(FONT_BOLD, 38), fill=WHITE, anchor="mm")
    d.text((W // 2, 900), "価格・在庫はリンク先でご確認ください", font=F(FONT_BOLD, 32), fill=(190, 210, 228), anchor="mm")
    logo(d, W // 2 - 190, 1080, 80)
    return im


def make(out):
    os.makedirs(out, exist_ok=True)
    S = sets()
    slides = [slide_cover(), slide_rule(), slide_set(S[0]), slide_set(S[1]), slide_set(S[2]), slide_jig(), slide_goods(), slide_cta()]
    files = []
    for i, im in enumerate(slides):
        fn = f"0{i + 1}.jpg"
        im.save(f"{out}/{fn}", quality=90)
        files.append(fn)
    cap = ("【PR】ショアジギングのおすすめタックルセット（初級・中級・上級）🎣\n\n"
           "関西の堤防・沖堤防で、40g前後のジグを投げる人向け。\n\n"
           "▼初級（最初の1セットに）\n・ダイワ ショアジギングX 96M＋23レガリス LT4000-CXH\n・クロスライド3G XR3-962M/LSJ＋26ナスキー C5000XG\n\n"
           "▼中級（軽さと強さを上げたい人に）\n・21コルトスナイパーBB S96M＋23ストラディック C5000XG\n・ドラッガーMX 96M＋25カルディア LT4000-CXH\n\n"
           "▼上級（ブリ級も見すえて）\n・24コルトスナイパーSS S96M＋21ツインパワーSW 4000XG\n\n"
           "ジグ・ラインの選び方と、あると便利な道具も入れました。\n"
           "仕様はメーカーの公表値（2026年10月調べ）。価格・在庫はリンク先でご確認ください。\n\n"
           "▼紹介した道具のリンク（楽天市場・Amazon）\n・プロフィールのリンクから、サイトの「おすすめ道具」へ\n\n"
           "保存して、道具選びのときに見返してね\n\n"
           "#PR #ショアジギング #ショアジギング初心者 #青物 #釣り道具 #タックル #メタルジグ #釣り初心者 #関西釣り #ツレドキ")
    json.dump({"key": "gear-sj-2026-11", "stamp": "gear-sj-20261104", "files": files, "caption": cap}, open(f"{out}/post.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(cap)


if __name__ == "__main__":
    make(sys.argv[2])
