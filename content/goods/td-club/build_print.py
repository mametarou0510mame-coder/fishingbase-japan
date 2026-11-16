# ANGLER'S CLUB の入稿データ（透過PNG）と SUZURI の SPEC を作る（2026-11-16 オーナー決定）
#   Tシャツ：左胸ワンポイント（絵＋文字）／ロンT・パーカー：前は文字だけ（B）、背中に大きく
#   キャップ・ステッカー：絵そのまま。モノクロ（推し）とカラーの両方。明るい服・濃い服の2版
#   python3 content/goods/td-club/build_print.py
import json, os
import numpy as np
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = f"{HERE}/owner"
OUT = f"{HERE}/print"
os.makedirs(OUT, exist_ok=True)
REL = "content/goods/td-club/print"
FISH = [("sawara", "サワラ"), ("buri", "ブリ"), ("madai", "真鯛"), ("aori", "アオリイカ"), ("seabass", "シーバス"), ("chinu", "チヌ")]


def load(sp, var, mono):
    im = Image.open(f"{SRC}/{sp}-{var}.png").convert("RGBA")
    im = im.crop(im.getbbox())
    if mono:
        a = im.split()[3]
        g = ImageOps.grayscale(im.convert("RGB"))
        g = ImageOps.autocontrast(g, cutoff=0.5)
        im = Image.merge("RGBA", (g, g, g, a))
    return im


def fit(im, w):
    return im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def textblock(var):
    im = Image.open(f"{SRC}/sawara-{var}.png").convert("RGBA")
    a = np.array(im)[..., 3]
    rows = np.where((a > 40).sum(1) > 0)[0]
    # 下から2本（TSUREDOKI / ANGLER'S CLUB）の帯：大きな空きの下
    gaps = np.where(np.diff(rows) > im.height * 0.01)[0]
    top = rows[gaps[-2] + 1] if len(gaps) >= 2 else rows[0]
    t = im.crop((0, top, im.width, im.height))
    return t.crop(t.getbbox())


def save(im, name):
    p = f"{OUT}/{name}.png"
    im.save(p, optimize=True)
    return f"{REL}/{name}.png"


files = {}
for var in ("light", "dark"):
    tb = textblock(var)
    c = canvas(3000, 3600)
    c.alpha_composite(fit(tb, 820), (1880, 420))
    files[("front-text", var)] = save(c, f"front-text-{var}")
for sp, ja in FISH:
    for mono in (True, False):
        mk = "mono" if mono else "color"
        for var in ("light", "dark"):
            art = load(sp, var, mono)
            # Tシャツ：左胸ワンポイント
            c = canvas(3000, 3600)
            a = fit(art, 760)
            c.alpha_composite(a, (1900, 360))
            files[(sp, mk, var, "tee")] = save(c, f"{sp}-{mk}-{var}-tee")
            # 背中：横幅いっぱい・上寄せ
            a = fit(art, 3600)
            c = canvas(4000, max(4600, a.height + 200))
            c.alpha_composite(a, (200, 100))
            files[(sp, mk, var, "back")] = save(c, f"{sp}-{mk}-{var}-back")
            # キャップ・ステッカー：絵そのまま
            files[(sp, mk, var, "art")] = save(fit(art, 3000), f"{sp}-{mk}-{var}-art")
        print("ok", sp, mk, flush=True)
json.dump({"|".join(k): v for k, v in files.items()}, open(f"{HERE}/print-files.json", "w"), ensure_ascii=False, indent=1)
