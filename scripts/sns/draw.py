# SNS用の画像を描く共通部品（Pillow）。色はサイトと同じ「藍」と「ウキの赤」。
import math
from PIL import Image, ImageDraw, ImageFont

NAVY = (16, 52, 90)
NAVY2 = (24, 72, 120)
RED = (227, 65, 43)
TEAL = (95, 195, 201)
GLOW = (242, 182, 48)
WHITE = (255, 255, 255)
MUTED = (200, 218, 232)

FONT_BLACK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"


def font(path, size):
    return ImageFont.truetype(path, size, index=0)  # index 0 = JP


def wave(d, w, y, amp, color, width=6, period=300, phase=0.0):
    pts = [(x, y + amp * math.sin((x / period) * 2 * math.pi + phase)) for x in range(0, w + 1, 6)]
    d.line(pts, fill=color, width=width, joint="curve")


def float_mark(d, cx, cy, s):
    """ウキのマーク（上半分が赤、下半分が白）。s は全体の高さの目安"""
    top = cy - s * 0.45
    mid = cy + s * 0.05
    bot = cy + s * 0.42
    w = s * 0.17
    d.line([(cx, top - s * 0.15), (cx, top)], fill=WHITE, width=max(2, int(s * 0.04)))
    d.polygon([(cx, top), (cx + w, mid), (cx - w, mid)], fill=RED)
    d.polygon([(cx - w, mid), (cx + w, mid), (cx, bot)], fill=WHITE)
    wave_y = mid + s * 0.08
    d.line([(cx - s * 0.5, wave_y), (cx - s * 0.25, wave_y - s * 0.05), (cx, wave_y), (cx + s * 0.25, wave_y + s * 0.05), (cx + s * 0.5, wave_y)], fill=TEAL, width=max(3, int(s * 0.05)), joint="curve")


def logo(d, x, y, size):
    float_mark(d, x + size * 0.5, y + size * 0.55, size)
    f = font(FONT_BLACK, int(size * 0.62))
    d.text((x + size * 1.05, y + size * 0.12), "ツレドキ", font=f, fill=WHITE)
    tw = d.textlength("ツレドキ", font=f)
    ft = font(FONT_BOLD, int(size * 0.26))
    bx = x + size * 1.15 + tw
    by = y + size * 0.3
    d.rounded_rectangle([bx, by, bx + size * 0.62, by + size * 0.42], radius=6, outline=WHITE, width=3)
    d.text((bx + size * 0.06, by + size * 0.04), "関西", font=ft, fill=WHITE)


def wave_fill(d, w, h, y, amp, color, period=420, phase=0.0):
    """y を中心に波打つ線から下を塗りつぶす"""
    pts = [(x, y + amp * math.sin((x / period) * 2 * math.pi + phase)) for x in range(0, w + 1, 4)]
    d.polygon(pts + [(w, h), (0, h)], fill=color)
