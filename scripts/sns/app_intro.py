# Instagram：サイト（アプリ）紹介のカルーセル画像を作る（1080x1350、7枚）
#   python scripts/sns/app_intro.py make <outdir>
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from draw import FONT_BLACK, FONT_BOLD, FONT_REG, GLOW, NAVY, NAVY2, RED, TEAL, WHITE, font, logo  # noqa: E402

W, H = 1080, 1350
A = "content/sns/app-intro"
INK = (20, 40, 64)
SUB = (80, 100, 118)
PAPER = (246, 249, 252)
ORANGE = (240, 140, 40)
_f = {}


def F(p, s):
    if (p, s) not in _f:
        _f[(p, s)] = font(p, s)
    return _f[(p, s)]


def phone(img_path, h, crop_top=0, crop_h=None):
    """スマホの枠にスクリーンショットを入れる（高さ h）"""
    sc = Image.open(img_path).convert("RGB")
    if crop_h:
        sc = sc.crop((0, crop_top, sc.width, crop_top + crop_h))
    bw = int(h * sc.width / sc.height)
    sc = sc.resize((bw, h), Image.LANCZOS)
    pad = 18
    fr = Image.new("RGBA", (bw + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(fr)
    d.rounded_rectangle((0, 0, fr.width - 1, fr.height - 1), radius=56, fill=(18, 22, 28))
    m = Image.new("L", sc.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, bw - 1, h - 1), radius=40, fill=255)
    fr.paste(sc, (pad, pad), m)
    sh = Image.new("RGBA", (fr.width + 80, fr.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 50, fr.width + 40, fr.height + 50), radius=56, fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    sh.alpha_composite(fr, (40, 40))
    return sh


def base(bg=PAPER):
    im = Image.new("RGBA", (W, H), bg + (255,))
    return im, ImageDraw.Draw(im)


def head(d, no, title, sub, color=NAVY):
    d.rounded_rectangle((60, 60, 60 + 90, 60 + 90), radius=24, fill=RED)
    d.text((105, 105), str(no), font=F(FONT_BLACK, 54), fill=WHITE, anchor="mm")
    d.text((175, 62), title, font=F(FONT_BLACK, 64), fill=color)
    d.text((178, 148), sub, font=F(FONT_BOLD, 34), fill=SUB)


def check(d, x, y, s, col=TEAL):
    d.line([(x, y), (x + s * 0.38, y + s * 0.36), (x + s, y - s * 0.4)], fill=col, width=max(6, int(s * 0.16)), joint="curve")


def bullets(d, x, y, items, size=36, gap=78, maxw=None):
    for it in items:
        d.ellipse((x, y + 12, x + 22, y + 34), fill=TEAL)
        d.text((x + 40, y), it, font=F(FONT_BOLD, size), fill=INK)
        y += gap
    return y


def foot(im, d, pr=False):
    d.rectangle((0, H - 96, W, H), fill=NAVY)
    logo(d, 60, H - 76, 54)
    d.text((W - 60, H - 48), "プロフィールのリンクから", font=F(FONT_BOLD, 34), fill=WHITE, anchor="rm")
    if pr:
        d.rounded_rectangle((W - 150, 70, W - 60, 120), radius=10, outline=SUB, width=3)
        d.text((W - 105, 95), "PR", font=F(FONT_BLACK, 30), fill=SUB, anchor="mm")


def make(out):
    os.makedirs(out, exist_ok=True)
    files = []

    def save(im, name):
        im.convert("RGB").save(f"{out}/{name}", quality=92)
        files.append(name)

    # 1 表紙
    im, d = base(NAVY)
    for i in range(14):
        d.line([(0, 980 + i * 26), (W, 940 + i * 26)], fill=NAVY2, width=3)
    logo(d, 70, 90, 96)
    d.text((70, 260), "釣り人のための", font=F(FONT_BLACK, 70), fill=WHITE)
    d.text((70, 350), "無料サイト", font=F(FONT_BLACK, 110), fill=GLOW)
    y = 540
    for t, c in [("全国239地点の潮見表", WHITE), ("予測と実際の潮位を重ねて表示", WHITE), ("写真から作れるデジタル魚拓", WHITE), ("おすすめ釣具もまとめて紹介", WHITE)]:
        d.rounded_rectangle((70, y, W - 70, y + 100), radius=26, fill=(34, 84, 134), outline=(120, 170, 210), width=3)
        check(d, 104, y + 50, 40)
        d.text((180, y + 50), t, font=F(FONT_BLACK, 48), fill=c, anchor="lm")
        y += 124
    d.text((W // 2, 1110), "スワイプして使い方を見る →", font=F(FONT_BOLD, 40), fill=(200, 222, 240), anchor="mm")
    foot(im, d)
    save(im, "01.jpg")

    # 2 潮見表（全国）
    im, d = base()
    head(d, 1, "全国239地点の潮見表", "気象庁の潮位表をもとに、地図から選べる")
    ph = phone(f"{A}/map.png", 880, 0, 2300)
    im.alpha_composite(ph, (20, 250))
    bullets(d, 610, 330, ["北海道から沖縄まで", "地図の青い点が", "  潮位ポイント", "近くの地点も", "  すぐ見つかる"], size=40, gap=86)
    foot(im, d)
    save(im, "02.jpg")

    # 3 推算潮位と実測潮位
    im, d = base()
    head(d, 2, "予測と「実際の潮位」", "推算潮位（青）と実測潮位（オレンジ）を重ねて表示")
    ph = phone(f"{A}/tide.png", 880, 380, 2150)
    im.alpha_composite(ph, (W - ph.width - 30, 240))
    y = bullets(d, 70, 330, ["いま「上げ何分」？", "満潮・干潮まで", "  あと何分？", "予測と実際の", "  ずれもわかる"], size=40, gap=86)
    d.rounded_rectangle((60, y + 20, 520, y + 210), radius=22, fill=(255, 244, 228), outline=ORANGE, width=3)
    d.text((86, y + 44), "気圧や風で、実際の", font=F(FONT_BOLD, 30), fill=INK)
    d.text((86, y + 88), "潮位は予測より", font=F(FONT_BOLD, 30), fill=INK)
    d.text((86, y + 132), "高く・低くなります", font=F(FONT_BOLD, 30), fill=INK)
    foot(im, d)
    save(im, "03.jpg")

    # 4 関西の釣りどき
    im, d = base()
    head(d, 3, "関西は「釣りどき」まで", "釣り場ごとの潮・天気・風・波を7日先まで")
    ph = phone(f"{A}/shio.png", 880, 0, 2300)
    im.alpha_composite(ph, (20, 250))
    bullets(d, 610, 330, ["行く日と時間を", "  決めやすい", "釣りどき指数", "  （0〜100）", "安全の目安も"], size=40, gap=86)
    foot(im, d)
    save(im, "04.jpg")

    # 5 魚拓
    im, d = base((240, 232, 214))
    head(d, 4, "写真からデジタル魚拓", "釣った魚を、和紙に墨で写したような1枚に", color=(40, 30, 20))
    g = Image.open(f"{A}/gyotaku-sample.png").convert("RGB")
    gw = W - 100
    g = g.resize((gw, int(gw * g.height / g.width)), Image.LANCZOS)
    sh = Image.new("RGBA", (g.width + 60, g.height + 60), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((30, 38, g.width + 30, g.height + 38), fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(16))
    sh.paste(g, (30, 30))
    im.alpha_composite(sh, (20, 230))
    y = 230 + g.height + 80
    bullets(d, 70, y, ["写真から魚を切り抜いて", "全長の目盛り・日付・釣り場を縦書きで", "画像で保存・シェアできる"], size=38, gap=70)
    foot(im, d)
    save(im, "05.jpg")

    # 6 マイ水族館
    im, d = base()
    head(d, 5, "マイ水族館", "釣った魚を登録すると、あなたの水族館で泳ぐ")
    ph = phone(f"{A}/aquarium.png", 880, 0, 2300)
    im.alpha_composite(ph, (W - ph.width - 30, 240))
    bullets(d, 70, 330, ["図鑑を埋めて", "  バッジ集め", "釣果の記録に", "ログイン不要", "無料"], size=40, gap=86)
    foot(im, d)
    save(im, "06.jpg")

    # 7 おすすめ釣具（PR）
    im, d = base()
    head(d, 6, "おすすめの釣り道具", "釣り場で使う道具を、はじめての1セットから")
    ph = phone(f"{A}/gear.png", 880, 250, 2300)
    im.alpha_composite(ph, (20, 250))
    bullets(d, 610, 330, ["サビキ・アジ・", "  タチウオなど", "釣り方ごとに", "  まとめて紹介", "セール情報も"], size=40, gap=86)
    d.text((610, 820), "※楽天市場などの", font=F(FONT_REG, 30), fill=SUB)
    d.text((610, 862), "　広告リンクを含みます", font=F(FONT_REG, 30), fill=SUB)
    foot(im, d, pr=True)
    save(im, "07.jpg")

    # 8 使ってみて
    im, d = base(NAVY)
    logo(d, 70, 90, 96)
    d.text((W // 2, 420), "使ってみてね", font=F(FONT_BLACK, 110), fill=WHITE, anchor="mm")
    d.text((W // 2, 560), "プロフィールのリンクから", font=F(FONT_BLACK, 62), fill=GLOW, anchor="mm")
    d.text((W // 2, 650), "または「ツレドキ 釣り」で検索", font=F(FONT_BOLD, 44), fill=WHITE, anchor="mm")
    d.rounded_rectangle((110, 760, W - 110, 980), radius=30, fill=(34, 84, 134), outline=(120, 170, 210), width=3)
    d.text((W // 2, 820), "ホーム画面に追加すると", font=F(FONT_BOLD, 42), fill=WHITE, anchor="mm")
    d.text((W // 2, 900), "アプリのように使えます", font=F(FONT_BLACK, 50), fill=WHITE, anchor="mm")
    d.text((W // 2, 1100), "保存して、釣りに行く前にチェック！", font=F(FONT_BOLD, 40), fill=(200, 222, 240), anchor="mm")
    foot(im, d)
    save(im, "08.jpg")

    cap = ("【無料】釣り人のためのサイト「ツレドキ」でできること\n\n"
           "✔ 全国239地点の潮見表（気象庁の潮位表をもとに表示）\n"
           "✔ 予測の潮位（推算潮位）と実際の潮位（実測潮位）を重ねて表示。いま「上げ何分・下げ何分」もひと目で\n"
           "✔ 関西の釣り場は、潮・天気・風・波と釣りどき指数を7日先まで\n"
           "✔ 釣った魚の写真からデジタル魚拓が作れる（マイ水族館・ログイン不要）\n"
           "✔ 釣り方ごとのおすすめ釣具も紹介【PR：楽天市場などの広告リンクを含みます】\n\n"
           "▶ プロフィールのリンクから使えます。ホーム画面に追加するとアプリのように使えます\n"
           "保存して、釣りに行く前にチェックしてね\n\n"
           "音声合成：VOICEVOX:四国めたん\n\n"
           "#釣り #潮見表 #タイドグラフ #魚拓 #釣り好きな人と繋がりたい #海釣り #堤防釣り #釣り初心者 #ツレドキ")
    json.dump({"key": "app-intro-2026-11", "stamp": "app-intro-20261103", "files": files, "caption": cap}, open(f"{out}/post.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    make(sys.argv[2])
