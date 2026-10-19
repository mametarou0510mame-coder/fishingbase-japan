# 釣り場ページ・釣り方ガイドのページごとのSNS共有用画像（1200x630）を作る。
#   python scripts/sns/make-og-pages.py   → public/og/spot-<slug>.png, public/og/guide-<slug>.png
# 釣り場の一覧は lib/spots.ts を node で読み込んで取り出す。
import glob, json, math, os, shutil, subprocess, sys, tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from draw import FONT_BLACK, FONT_BOLD, GLOW, NAVY, NAVY2, RED, TEAL, WHITE, MUTED, font, logo  # noqa: E402

W, H = 1200, 630
OUT = "public/og"


def load_spots():
    tmp = tempfile.mkdtemp()
    shutil.copy("lib/spots.ts", f"{tmp}/spots.mts")
    code = f"import('{tmp}/spots.mts').then(m=>console.log(JSON.stringify(m.publishedSpots())))"
    r = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e", code], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def fit(d, text, path, sizes, maxw):
    for sz in sizes:
        f = font(path, sz)
        if d.textlength(text, font=f) <= maxw:
            return f
    return font(path, sizes[-1])


def base():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(16 + 8 * t), int(52 + 10 * t), int(90 + 20 * t)))
    for k, (y, amp, col) in enumerate([(500, 14, (24, 84, 132)), (540, 12, (40, 120, 170)), (585, 10, (18, 64, 110))]):
        pts = [(x, y + amp * math.sin(x / (180 + k * 40) + k)) for x in range(0, W + 1, 6)]
        d.polygon(pts + [(W, H), (0, H)], fill=col)
    logo(d, 56, 44, 64)
    return img, d


def chip(d, x, y, text, fill=WHITE, color=NAVY, size=30):
    f = font(FONT_BOLD, size)
    w = d.textlength(text, font=f)
    d.rounded_rectangle([x, y, x + w + 40, y + size + 24], radius=(size + 24) // 2, fill=fill)
    d.text((x + 20, y + 10), text, font=f, fill=color)
    return x + w + 52


def spot_card(s):
    img, d = base()
    f = fit(d, s["name"], FONT_BLACK, [84, 76, 68, 60, 52], W - 112)
    d.text((56, 170), s["name"], font=f, fill=WHITE)
    d.text((60, 190 + f.size), f"{s['area']}・{s['type']}", font=font(FONT_BOLD, 36), fill=(200, 222, 240))
    x = 56
    for t in ["最近の釣果", "タイドグラフ", "天気・風", "料金・ルール"]:
        x = chip(d, x, 380, t)
    img.save(f"{OUT}/spot-{s['slug']}.png", optimize=True)


def guide_card(g):
    img, d = base()
    chip(d, 56, 150, f"釣り方ガイド No.{g['no']}", fill=RED, color=WHITE, size=28)
    f = fit(d, g["title"], FONT_BLACK, [84, 76, 68, 60, 52], W - 112)
    d.text((56, 220), g["title"], font=f, fill=WHITE)
    d.text((60, 240 + f.size), g["sub"], font=font(FONT_BOLD, 40), fill=GLOW)
    x = 56
    for t in ["動画つき", "その日のパターン", "初級・中級・上級の道具"]:
        x = chip(d, x, 420, t)
    img.save(f"{OUT}/guide-{g['slug']}.png", optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    spots = load_spots()
    for s in spots:
        spot_card(s)
    gs = [json.load(open(p, encoding="utf-8")) for p in glob.glob("content/guides/*.json") if not os.path.basename(p).startswith("_")]
    for g in gs:
        guide_card(g)
    print(f"spots {len(spots)}, guides {len(gs)}")


if __name__ == "__main__":
    main()
