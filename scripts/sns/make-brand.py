# SNSのアイコンとYouTubeバナーを作る。
#   python scripts/sns/make-brand.py <outdir>
#   icon-a.png  … ウキと波（文字なし。小さく表示されても見やすい）
#   icon-b.png  … ウキ＋「ツレドキ」の文字
#   youtube-banner.png … 2560x1440（文字は中央の安全範囲 1546x423 に収める）
import math, os, sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from draw import FONT_BLACK, FONT_BOLD, GLOW, NAVY, NAVY2, RED, TEAL, WHITE, MUTED, font, logo  # noqa: E402

DEEP = (9, 32, 58)
SEA1 = (24, 84, 132)
SEA2 = (40, 120, 170)


def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def wave_band(d, w, h, y, amp, period, phase, color):
    pts = [(x, y + amp * math.sin(x / period * 2 * math.pi + phase)) for x in range(0, w + 1, 4)]
    d.polygon(pts + [(w, h), (0, h)], fill=color)


def big_float(img, cx, cy, s, glow=True):
    """大きなウキ（紡錘形。上が赤、下が白）。水面から下は水の色が重なり、まわりに波紋"""
    if glow:
        g = Image.new("L", img.size, 0)
        ImageDraw.Draw(g).ellipse([cx - s * 0.55, cy - s * 0.75, cx + s * 0.55, cy + s * 0.35], fill=110)
        g = g.filter(ImageFilter.GaussianBlur(s * 0.18))
        img.paste(Image.new("RGB", img.size, (60, 140, 200)), (0, 0), g)
    d = ImageDraw.Draw(img, "RGBA")
    top, bot = cy - s * 0.52, cy + s * 0.42
    w = s * 0.2
    n = 40
    def body(t0, t1):
        right = [(cx + w * math.sin(math.pi * t) ** 0.7, top + (bot - top) * t) for t in [t0 + (t1 - t0) * i / n for i in range(n + 1)]]
        left = [(2 * cx - x, y) for x, y in reversed(right)]
        return right + left
    # 棒（トップ）
    d.rounded_rectangle([cx - s * 0.02, top - s * 0.24, cx + s * 0.02, top + s * 0.04], radius=int(s * 0.02), fill=WHITE)
    d.polygon(body(0.0, 0.5), fill=RED)
    d.polygon(body(0.5, 1.0), fill=WHITE)
    d.line([(cx - w, top + (bot - top) * 0.5), (cx + w, top + (bot - top) * 0.5)], fill=(200, 50, 35), width=max(2, int(s * 0.012)))
    # つや
    d.ellipse([cx - w * 0.62, top + (bot - top) * 0.16, cx - w * 0.3, top + (bot - top) * 0.42], fill=(245, 130, 110, 230))
    # 水面より下は水の色を重ねる
    wy = top + (bot - top) * 0.66
    d.polygon(body(0.66, 1.0), fill=(30, 110, 170, 150))
    for k, a in enumerate((1.0, 0.65, 0.35)):
        rx = s * (0.34 + k * 0.2)
        ry = s * (0.05 + k * 0.025)
        col = (*TEAL, int(255 * a))
        d.arc([cx - rx, wy - ry, cx + rx, wy + ry], 0, 180, fill=col, width=max(3, int(s * 0.03)))
        d.arc([cx - rx, wy - ry, cx + rx, wy + ry], 180, 360, fill=(*TEAL, int(120 * a)), width=max(2, int(s * 0.015)))
    return d


def icon(path, with_text):
    S = 1080
    img = gradient(S, S, NAVY2, DEEP)
    d = ImageDraw.Draw(img)
    wave_band(d, S, S, S * 0.74, 22, 520, 0.4, SEA1)
    wave_band(d, S, S, S * 0.82, 18, 420, 2.2, SEA2)
    if with_text:
        big_float(img, S / 2, S * 0.42, S * 0.5)
        d = ImageDraw.Draw(img)
        f = font(FONT_BLACK, 150)
        t = "ツレドキ"
        tw = d.textlength(t, font=f)
        d.text(((S - tw) / 2, S * 0.66), t, font=f, fill=WHITE)
    else:
        big_float(img, S / 2, S * 0.5, S * 0.62)
        d = ImageDraw.Draw(img)
        fb = font(FONT_BOLD, 70)
        t = "関西"
        tw = d.textlength(t, font=fb)
        bx, by = S / 2 - tw / 2 - 28, S * 0.8
        d.rounded_rectangle([bx, by, bx + tw + 56, by + 104], radius=52, outline=WHITE, width=6)
        d.text((bx + 28, by + 6), t, font=fb, fill=WHITE)
    # 丸く切り取られても端が欠けないよう、四角のまま書き出す（SNS側で丸くなる）
    img.save(path, optimize=True)


def banner(path):
    W, H = 2560, 1440
    img = gradient(W, H, (14, 44, 78), DEEP)
    d = ImageDraw.Draw(img)
    # 星（夜明け前の空）
    for k in range(80):
        x, y = (k * 389) % W, 60 + (k * 211) % 520
        r = 2 + (k % 3)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(120, 160, 200))
    # 朝日のにじみ
    g = Image.new("L", (W, H), 0)
    ImageDraw.Draw(g).ellipse([W * 0.62, H * 0.38, W * 0.98, H * 0.72], fill=120)
    g = g.filter(ImageFilter.GaussianBlur(120))
    img.paste(Image.new("RGB", (W, H), (242, 182, 48)), (0, 0), g)
    d = ImageDraw.Draw(img)
    wave_band(d, W, H, H * 0.66, 26, 700, 0.3, SEA1)
    wave_band(d, W, H, H * 0.72, 22, 560, 1.9, SEA2)
    wave_band(d, W, H, H * 0.8, 18, 460, 3.1, (18, 64, 110))
    # 安全範囲（中央 1546x423）
    sx, sy = (W - 1546) / 2, (H - 423) / 2
    big_float(img, sx + 150, sy + 215, 300)
    d = ImageDraw.Draw(img)
    f = font(FONT_BLACK, 128)
    d.text((sx + 330, sy + 10), "ツレドキ", font=f, fill=WHITE)
    tw = d.textlength("ツレドキ", font=f)
    fb = font(FONT_BOLD, 58)
    bx, by = sx + 330 + tw + 26, sy + 44
    d.rounded_rectangle([bx, by, bx + 150, by + 88], radius=44, outline=WHITE, width=5)
    d.text((bx + 17, by + 6), "関西", font=fb, fill=WHITE)
    ft = font(FONT_BOLD, 46)
    d.text((sx + 334, sy + 182), "いつ・どこで・何が釣れる？を、毎日ショート動画で", font=ft, fill=(220, 236, 248))
    # 投稿スケジュールのチップ
    chips = [("6:00", "今日の釣れる時間"), ("12:00", "釣り方ガイド"), ("18:00", "お得情報"), ("0:00", "釣りの豆知識")]
    fc, fh = font(FONT_BOLD, 28), font(FONT_BLACK, 28)
    x = sx + 334
    y = sy + 290
    for tm, lab in chips:
        w1 = d.textlength(tm, font=fh)
        w2 = d.textlength(lab, font=fc)
        d.rounded_rectangle([x, y, x + w1 + w2 + 52, y + 56], radius=28, fill=(255, 255, 255))
        d.text((x + 16, y + 10), tm, font=fh, fill=RED)
        d.text((x + 30 + w1, y + 10), lab, font=fc, fill=NAVY)
        x += w1 + w2 + 66
    assert x - 66 <= sx + 1546, "チップが安全範囲からはみ出しています"
    img.save(path, optimize=True)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    icon(f"{out}/icon-a.png", False)
    icon(f"{out}/icon-b.png", True)
    banner(f"{out}/youtube-banner.png")
    print("ok")
