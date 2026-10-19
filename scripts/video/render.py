# 釣り方ガイドの図解アニメ動画を作る（縦 1080x1920・30fps）。
# 使い方: python3 scripts/video/render.py <slug> [--stills]
#   入力: build/video/<slug>/timeline.json（narrate.py が作る）と line-XX.wav
#   出力: public/videos/<slug>.mp4、public/videos/<slug>.jpg（サムネイル）
#   --stills: 動画の代わりに各シーンの静止画を build/video/<slug>/stills/ に書き出す（確認用）
import json
import math
import re
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sns"))
from draw import FONT_BLACK, FONT_BOLD, FONT_REG, GLOW, NAVY, NAVY2, RED, TEAL, WHITE, MUTED, float_mark, font, logo  # noqa: E402

W, H, FPS = 1080, 1920, 30
PX, PY, PW, PH = 50, 300, 980, 1020  # 図を描く白いパネル
INK = (20, 40, 64)
PANEL = (238, 245, 250)
SEA = (126, 192, 226)
SEA_DEEP = (64, 132, 186)
SAND = (226, 210, 170)
LAND = (222, 214, 192)
CONCRETE = (176, 180, 186)
SILVER = (196, 206, 216)
LEAD, GAP, TAIL = 0.4, 0.25, 0.7

_fonts = {}


def F(path, size):
    key = (path, size)
    if key not in _fonts:
        _fonts[key] = font(path, size)
    return _fonts[key]


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def clamp01(x):
    return max(0.0, min(1.0, x))


def wrap(d, text, f, maxw, tokens=False):
    if tokens:
        # 「・」「、」などの区切りで折り返す（単語の途中で切らない）
        toks = [t for t in re.findall(r"[^・、。）」]*[・、。）」]?", text) if t]
        lines, cur = [], ""
        for tk in toks:
            if d.textlength(cur + tk, font=f) <= maxw or not cur:
                cur += tk
            else:
                lines.append(cur)
                cur = tk
        if cur:
            lines.append(cur)
        if all(d.textlength(ln, font=f) <= maxw for ln in lines):
            return lines
    lines, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=f) > maxw and cur:
            # 句読点や閉じかっこは行頭に置かない
            if ch in "、。）」！？ー":
                cur += ch
                continue
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    # 最後の行が1〜2文字だけにならないようにする
    if len(lines) >= 2 and len(lines[-1]) <= 2 and len(lines[-2]) > 4:
        lines[-1] = lines[-2][-2:] + lines[-1]
        lines[-2] = lines[-2][:-2]
    return lines


def fit_lines(d, text, path, sizes, maxw, max_lines=2):
    """大きい順に試し、max_lines 行に収まる最大の文字サイズを選ぶ"""
    for sz in sizes:
        f = F(path, sz)
        ls = wrap(d, text, f, maxw, tokens=True)
        if len(ls) <= max_lines:
            return f, ls
    f = F(path, sizes[-1])
    return f, wrap(d, text, f, maxw, tokens=True)


def center_text(d, cx, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text((cx - w / 2, y), text, font=f, fill=fill)


def alpha(color, a):
    return (*color[:3], int(255 * clamp01(a)))


# ---------- 部品 ----------
def fish(d, x, y, size, facing=-1, color=(70, 110, 150), a=1.0):
    """facing=-1 で左向き"""
    L = size
    body = [(x - L * 0.5, y - L * 0.18), (x + L * 0.5, y + L * 0.18)]
    d.ellipse(body, fill=alpha(color, a))
    tx = x - facing * L * 0.5
    d.polygon([(tx, y), (tx - facing * L * 0.28, y - L * 0.2), (tx - facing * L * 0.28, y + L * 0.2)], fill=alpha(color, a))
    ex = x + facing * L * 0.3
    d.ellipse([ex - L * 0.04, y - L * 0.07, ex + L * 0.04, y + L * 0.01], fill=alpha(WHITE, a))


def jig_shape(d, cx, cy, length, angle_deg=0, color=SILVER, a=1.0):
    """メタルジグ（細長い六角形）。cx,cy は中心"""
    w = length * 0.2
    pts = [(0, -length / 2), (w * 0.5, -length * 0.3), (w * 0.55, length * 0.25), (0, length / 2), (-w * 0.55, length * 0.25), (-w * 0.5, -length * 0.3)]
    r = math.radians(angle_deg)
    rot = [(cx + px * math.cos(r) - py * math.sin(r), cy + px * math.sin(r) + py * math.cos(r)) for px, py in pts]
    d.polygon(rot, fill=alpha(color, a), outline=alpha(INK, a))
    # 背中の色（ブルー）
    hp = [(0, -length / 2), (w * 0.5, -length * 0.3), (w * 0.55, length * 0.25), (0, length / 2)]
    hrot = [(cx + px * math.cos(r) - py * math.sin(r), cy + px * math.sin(r) + py * math.cos(r)) for px, py in hp]
    d.polygon(hrot, fill=alpha((70, 120, 200), a * 0.8))


def hook(d, x, y, s, color=INK, width=4):
    d.line([(x, y), (x, y + s)], fill=color, width=width)
    d.arc([x - s * 0.5, y + s * 0.6, x + s * 0.1, y + s * 1.2], 0, 180, fill=color, width=width)
    d.line([(x - s * 0.5, y + s * 0.9), (x - s * 0.42, y + s * 0.7)], fill=color, width=width)


def label(d, x, y, text, f, fill=INK, bg=None, pad=10):
    if bg:
        w = d.textlength(text, font=f)
        d.rounded_rectangle([x - pad, y - pad * 0.6, x + w + pad, y + f.size + pad * 0.8], radius=12, fill=bg)
    d.text((x, y), text, font=f, fill=fill)


def heading(d, text, a=1.0):
    f = F(FONT_BLACK, 54)
    d.text((44, 36), text, font=f, fill=alpha(NAVY, a))
    d.line([(44, 112), (44 + d.textlength(text, font=f), 112)], fill=alpha(RED, a), width=6)


# ---------- シーン ----------
def scene_title(d, t, dur, s, meta):
    no = meta.get("no")
    f = F(FONT_BOLD, 40)
    tag = f"釣り方ガイド No.{no}" if no else "釣り方ガイド"
    tw = d.textlength(tag, font=f)
    d.rounded_rectangle([PW / 2 - tw / 2 - 24, 90, PW / 2 + tw / 2 + 24, 150], radius=30, fill=NAVY)
    center_text(d, PW / 2, 96, tag, f, WHITE)
    ft, lines = fit_lines(d, meta["title"], FONT_BLACK, [96, 92, 88, 84, 80], PW - 120, 1)
    if len(lines) > 1:
        ft = F(FONT_BLACK, 92)
        lines = wrap(d, meta["title"], ft, PW - 120)
    y = 230
    for i, ln in enumerate(lines):
        a = ease((t - 0.15 * i) / 0.5)
        center_text(d, PW / 2, y + (1 - a) * 40, ln, ft, alpha(NAVY, a))
        y += 124
    if meta.get("sub"):
        fs = F(FONT_BOLD, 60)
        a = ease((t - 0.5) / 0.5)
        center_text(d, PW / 2, y + 20, meta["sub"], fs, alpha(RED, a))
    # 海とウキ
    sea_y = 760
    pts = [(x, sea_y + 14 * math.sin(x / 140 + t * 2.2)) for x in range(0, PW + 1, 8)]
    d.polygon(pts + [(PW, PH), (0, PH)], fill=SEA)
    pts2 = [(x, sea_y + 70 + 12 * math.sin(x / 110 - t * 1.8)) for x in range(0, PW + 1, 8)]
    d.polygon(pts2 + [(PW, PH), (0, PH)], fill=SEA_DEEP)
    bob = 10 * math.sin(t * 3)
    float_mark(d, PW / 2, sea_y - 30 + bob, 150)
    for i in range(3):
        fx = (PW + 100) - ((t * 90 + i * 330) % (PW + 200))
        fish(d, fx, sea_y + 150 + i * 50, 70, -1, (40, 90, 140))


def scene_tackle(d, t, dur, s, meta):
    heading(d, s.get("heading", "道具"))
    items = s["items"]
    n = len(items)
    step = min(0.8, (dur * 0.55) / max(n, 1))
    fl = F(FONT_BOLD, 40)
    fv = F(FONT_BLACK, 52)
    y = 170
    for i, (k, v) in enumerate(items):
        a = ease((t - 0.3 - i * step) / 0.45)
        if a <= 0:
            y += 160
            continue
        dx = (1 - a) * 120
        d.rounded_rectangle([40 + dx, y, PW - 40 + dx, y + 136], radius=22, fill=alpha(WHITE, a), outline=alpha((200, 214, 228), a), width=3)
        d.rounded_rectangle([62 + dx, y + 36, 300 + dx, y + 100], radius=32, fill=alpha(NAVY, a))
        kw = d.textlength(k, font=fl)
        d.text((181 + dx - kw / 2, y + 42), k, font=fl, fill=alpha(WHITE, a))
        vl = wrap(d, v, fv, PW - 380)
        if len(vl) == 1:
            d.text((330 + dx, y + 36), v, font=fv, fill=alpha(INK, a))
        else:
            fv2 = F(FONT_BLACK, 40)
            vl = wrap(d, v, fv2, PW - 380)
            for j, ln in enumerate(vl[:2]):
                d.text((330 + dx, y + 18 + j * 52), ln, font=fv2, fill=alpha(INK, a))
        y += 160


def scene_rig(d, t, dur, s, meta):
    heading(d, s.get("heading", "仕掛け"))
    kind = s["kind"]
    labels = s.get("labels", [])
    cx = 300
    prog = ease(t / max(1.5, dur * 0.55))
    top, bottom = 160, 960
    ycut = top + (bottom - top) * prog
    fl = F(FONT_BOLD, 42)

    if kind in ("jig", "blade"):
        parts_y = [230, 330, 470, 600, 760] if kind == "jig" else [230, 330, 460, 580, 720]
        # PEライン
        y2 = min(ycut, 330)
        for yy in range(top, int(y2), 18):
            d.line([(cx, yy), (cx, min(yy + 10, y2))], fill=(90, 170, 60), width=5)
        if ycut > 330:
            d.ellipse([cx - 14, 316, cx + 14, 344], fill=RED)
            d.line([(cx, 344), (cx, min(ycut, 580))], fill=(150, 190, 230), width=9)
        if ycut > 580:
            d.ellipse([cx - 16, 570, cx + 16, 610], outline=INK, width=6)
        if kind == "jig" and ycut > 620:
            hook(d, cx + 18, 612, 34, INK, 4)
            jig_shape(d, cx, 760, 280 * clamp01((ycut - 620) / 200 + 0.2))
        if kind == "blade" and ycut > 620:
            jig_shape(d, cx, 700, 170 * clamp01((ycut - 620) / 120 + 0.3), color=(225, 196, 90))
            d.ellipse([cx - 10, 786, cx + 10, 806], outline=INK, width=4)
            if ycut > 800:
                ph = t * 14
                bw = 46 * abs(math.cos(ph)) + 6
                d.ellipse([cx - bw, 812, cx + bw, 900], fill=(236, 200, 70), outline=(150, 110, 20), width=3)
                hl = 0.5 + 0.5 * math.cos(ph)
                d.ellipse([cx - bw * 0.4, 830, cx + bw * 0.3, 860], fill=alpha(WHITE, hl * 0.9))
                hook(d, cx + 14, 620, 30, INK, 4)
                # 光と振動
                for k in range(3):
                    r = 70 + ((t * 120 + k * 40) % 120)
                    a = 1 - (r - 70) / 120
                    d.arc([cx - r, 856 - r, cx + r, 856 + r], 20, 160, fill=alpha((240, 190, 40), a * 0.8), width=4)
    else:  # sabiki
        parts_y = [180, 260, 420, 520, 860]
        d.line([(cx, top), (cx, min(ycut, 245))], fill=(90, 90, 90), width=4)
        if ycut > 250:
            d.ellipse([cx - 12, 248, cx + 12, 272], outline=INK, width=5)
            d.line([(cx, 272), (cx, min(ycut, 800))], fill=(150, 150, 150), width=3)
            for i in range(6):
                by = 320 + i * 80
                if ycut < by:
                    break
                side = 1 if i % 2 == 0 else -1
                d.line([(cx, by), (cx + side * 46, by + 14)], fill=(150, 150, 150), width=3)
                hx = cx + side * 50
                hook(d, hx, by + 14, 26, INK, 3)
                d.polygon([(hx, by + 10), (hx + side * 22, by + 2), (hx + side * 22, by + 26)], fill=(240, 120, 150))
        if ycut > 800:
            d.rounded_rectangle([cx - 46, 806, cx + 46, 910], radius=10, outline=INK, width=5, fill=(250, 236, 220))
            for gx in range(-30, 40, 20):
                d.line([(cx + gx, 812), (cx + gx, 904)], fill=(180, 160, 140), width=2)
            for i in range(14):
                d.ellipse([cx - 34 + (i * 37) % 66, 826 + (i * 23) % 70, cx - 26 + (i * 37) % 66, 834 + (i * 23) % 70], fill=(232, 120, 80))
            # 撒き餌が出ていく
            tp = t - dur * 0.55
            if tp > 0:
                for i in range(26):
                    ph = (tp * 0.6 + i / 26) % 1
                    ang = i * 2.4
                    px = cx + math.cos(ang) * 40 * (1 + ph * 4)
                    py = 820 - ph * 260 + math.sin(ang) * 20
                    d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=alpha((232, 120, 80), 1 - ph))
    # ラベル
    for i, (ly, txt) in enumerate(zip(parts_y, labels)):
        if ycut < ly:
            break
        a = ease((ycut - ly) / 60)
        lx = 500
        d.line([(cx + 40, ly + 8), (lx - 16, ly + 8)], fill=alpha(MUTED, a), width=3)
        d.ellipse([cx + 32, ly, cx + 48, ly + 16], fill=alpha(RED, a))
        f2 = fl if d.textlength(txt, font=fl) < PW - lx - 30 else F(FONT_BOLD, 34)
        label(d, lx, ly - 14, txt, f2, alpha(INK, a), bg=alpha(WHITE, a))


def scene_place(d, t, dur, s, meta):
    heading(d, s.get("heading", "狙う場所"))
    top = 150
    d.rectangle([0, top, PW, PH], fill=SEA)
    # 流れ
    for i in range(10):
        y = top + 40 + (i * 67) % 560
        x = ((t * 60 + i * 173) % (PW + 200)) - 100
        d.line([(x, y), (x + 60, y)], fill=alpha(WHITE, 0.5), width=3)
    land_y = 820
    d.rectangle([0, land_y, PW, PH], fill=LAND)
    for gx in range(0, PW, 60):
        d.line([(gx, land_y), (gx, PH)], fill=(210, 200, 176), width=2)
    # 堤防（T字）
    d.rectangle([420, 420, 560, land_y], fill=CONCRETE)
    d.rectangle([300, 360, 680, 440], fill=CONCRETE)
    d.line([(300, 360), (680, 360)], fill=(140, 144, 150), width=4)
    marks = s.get("marks", [])
    n = len(marks)
    step = (dur * 0.6) / max(n, 1)
    fl = F(FONT_BOLD, 40)
    for i, m in enumerate(marks):
        a = ease((t - 0.3 - i * step) / 0.5)
        if a <= 0:
            continue
        if m == "tip":
            for k in range(2):
                r = 40 + ((t * 50 + k * 35) % 70)
                d.ellipse([680 - r, 400 - r, 680 + r, 400 + r], outline=alpha(RED, a * (1 - (r - 40) / 70)), width=6)
            d.ellipse([668, 388, 692, 412], fill=alpha(RED, a))
            label(d, 40, 470, "先端（潮が当たる）", fl, alpha(WHITE, a), bg=alpha(RED, a))
        if m == "shiome":
            pts = [(x, 230 + 26 * math.sin(x / 120 + 0.6)) for x in range(0, PW + 1, 10)]
            for j in range(0, len(pts) - 1, 2):
                if j / len(pts) < a:
                    d.line([pts[j], pts[j + 1]], fill=WHITE, width=7)
            for k in range(18):
                fx = (k * 61 + t * 20) % PW
                d.ellipse([fx - 4, 238 + 26 * math.sin(fx / 120 + 0.6) - 4, fx + 4, 238 + 26 * math.sin(fx / 120 + 0.6) + 4], fill=alpha(WHITE, a * 0.8))
            label(d, 40, 170, "潮目", fl, alpha(WHITE, a), bg=alpha(NAVY, a))
        if m == "bait":
            for k in range(16):
                ang = t * 1.5 + k * 0.4
                fx = 830 + math.cos(ang) * (30 + k * 4)
                fy = 300 + math.sin(ang) * (16 + k * 2)
                d.ellipse([fx - 9, fy - 4, fx + 9, fy + 4], fill=alpha((40, 70, 100), a))
            label(d, 740, 520, "小魚の群れ", fl, alpha(WHITE, a), bg=alpha(NAVY, a))
        if m == "foot":
            glow = 0.6 + 0.4 * math.sin(t * 4)
            for (x0, y0, x1, y1) in [(410, 440, 420, land_y), (560, 440, 570, land_y), (300, 350, 680, 360)]:
                d.rectangle([x0 - 4, y0, x1 + 4, y1], fill=alpha(GLOW, a * glow))
            label(d, 70, 560, "足元の際（へり）", fl, alpha(WHITE, a), bg=alpha(NAVY, a))
            d.line([(400, 600), (412, 600)], fill=alpha(NAVY, a), width=4)
        if m == "light":
            lx, ly = 610, 600
            for r in range(120, 20, -20):
                d.ellipse([lx - r, ly - r, lx + r, ly + r], fill=alpha((255, 240, 160), a * 0.06))
            d.line([(560, 600), (lx, ly)], fill=alpha(INK, a), width=6)
            d.ellipse([lx - 14, ly - 14, lx + 14, ly + 14], fill=alpha((255, 220, 80), a))
            label(d, 650, 690, "常夜灯", fl, alpha(WHITE, a), bg=alpha(NAVY, a))
    # 釣り人
    d.ellipse([478, 640, 502, 664], fill=INK)
    d.line([(490, 664), (490, 700)], fill=INK, width=6)


# --- アクション（横から見た図）---
SURF, BOT = 470, 960
XS, XE = 880, 250


def ydepth(dd):
    return SURF + dd * (BOT - 30 - SURF)


def action_path(kind, u):
    """u: 0〜1。戻り値 (x, depth 0〜1, angle, jerking)"""
    if kind == "fast":
        if u < 0.08:
            return XS, 0.1 * u / 0.08, 0, False
        v = (u - 0.08) / 0.92
        return XS - (XS - XE) * v, 0.08 + 0.012 * math.sin(v * 60), -90, False
    if kind == "steady":
        if u < 0.25:
            return XS, 0.45 * u / 0.25, 0, False
        v = (u - 0.25) / 0.75
        return XS - (XS - XE) * v, 0.45 - 0.08 * v, -90, False
    if kind == "countdown":
        if u < 0.5:
            return XS, 0.62 * u / 0.5, 0, False
        v = (u - 0.5) / 0.5
        return XS - (XS - XE) * v, 0.6, -90, False
    if kind == "onepitch":
        if u < 0.18:
            return XS, u / 0.18, 0, False
        n = 7
        v = (u - 0.18) / 0.82 * n
        k = min(int(v), n - 1)
        w = v - k
        step = 0.7 / n
        Lk = 1 - k * step
        xk = XS - (XS - XE) * k / n
        dx = (XS - XE) / n
        if w < 0.35:
            e = ease(w / 0.35)
            dd = Lk - step * 1.3 * e
            x = xk - dx * 0.8 * e
            ang = -40 if k % 2 == 0 else -140
            return x, dd, ang, True
        r = (w - 0.35) / 0.65
        return xk - dx * (0.8 + 0.2 * r), Lk - step * 1.3 + step * 0.3 * r, 0 if k % 2 else 180, False
    if kind == "liftfall":
        if u < 0.15:
            return XS, u / 0.15, 0, False
        n = 4
        v = (u - 0.15) / 0.85 * n
        k = min(int(v), n - 1)
        w = v - k
        dx = (XS - XE) / n
        xk = XS - dx * k
        if w < 0.3:
            e = ease(w / 0.3)
            return xk - dx * 0.5 * e, 1 - 0.5 * e, -90, True
        r = (w - 0.3) / 0.7
        return xk - dx * (0.5 + 0.5 * r), 0.5 + 0.5 * r ** 1.4, 30, False
    if kind == "sabiki":
        x = 230
        if u < 0.25:
            return x, 0.5 * u / 0.25, 0, False
        if u < 0.6:
            w = ((u - 0.25) / 0.35 * 3) % 1
            if w < 0.3:
                return x, 0.5 - 0.1 * ease(w / 0.3), 0, True
            return x, 0.4 + 0.1 * ((w - 0.3) / 0.7), 0, False
        return x, 0.5, 0, False
    return XS, 0.5, 0, False


def scene_action(d, t, dur, s, meta):
    heading(d, s.get("heading", "アクション"))
    kind = s["kind"]
    # 名前
    fn = F(FONT_BLACK, 58)
    fs = F(FONT_BOLD, 38)
    d.text((260, 136), s.get("name", ""), font=fn, fill=RED)
    d.text((262, 210), s.get("sub", ""), font=fs, fill=INK)
    # 空と海
    d.rectangle([0, SURF, PW, PH], fill=SEA)
    d.rectangle([0, SURF + 260, PW, PH], fill=alpha(SEA_DEEP, 0.35))
    pts = [(x, SURF + 6 * math.sin(x / 50 + t * 3)) for x in range(0, PW + 1, 8)]
    d.line(pts, fill=WHITE, width=4)
    sand = [(x, BOT + 10 * math.sin(x / 90)) for x in range(0, PW + 1, 10)]
    d.polygon(sand + [(PW, PH), (0, PH)], fill=SAND)
    # 堤防と釣り人
    d.rectangle([0, SURF - 60, 150, PH], fill=CONCRETE)
    d.ellipse([60, SURF - 190, 96, SURF - 154], fill=INK)
    d.line([(78, SURF - 154), (78, SURF - 90)], fill=INK, width=8)
    d.line([(78, SURF - 90), (62, SURF - 60)], fill=INK, width=7)
    d.line([(78, SURF - 90), (96, SURF - 60)], fill=INK, width=7)

    u = clamp01((t - 0.2) / max(1.0, dur - 0.6))
    x, dd, ang, jerking = action_path(kind, u)
    y = ydepth(dd)
    # 竿
    rod_ang = -70 if jerking else -35
    rx0, ry0 = 90, SURF - 120
    rl = 170
    tipx = rx0 + rl * math.cos(math.radians(rod_ang))
    tipy = ry0 + rl * math.sin(math.radians(rod_ang))
    d.line([(rx0, ry0), (tipx, tipy)], fill=(40, 40, 40), width=7)
    d.line([(78, SURF - 140), (rx0, ry0)], fill=INK, width=6)
    # 層の目盛（カウントダウン）
    if kind == "countdown":
        fsm = F(FONT_BOLD, 32)
        for sec, dep in [(5, 0.2), (10, 0.4), (15, 0.6)]:
            yy = ydepth(dep)
            for xx in range(170, PW, 26):
                d.line([(xx, yy), (xx + 12, yy)], fill=alpha(WHITE, 0.8), width=3)
            d.text((172, yy - 40), f"{sec}秒", font=fsm, fill=WHITE)
        if u < 0.5:
            cnt = int(15 * u / 0.5) + 1
            fb = F(FONT_BLACK, 110)
            center_text(d, 700, SURF + 20, f"{cnt}", fb, alpha(WHITE, 0.9))
    if kind == "sabiki":
        # 仕掛け
        d.line([(tipx, tipy), (x, SURF), (x, y)], fill=(90, 90, 90), width=3)
        for i in range(5):
            hy = y - 160 + i * 34
            if hy < SURF:
                continue
            d.line([(x, hy), (x + 26, hy + 8)], fill=(110, 110, 110), width=3)
            d.polygon([(x + 26, hy + 4), (x + 40, hy), (x + 40, hy + 16)], fill=(240, 120, 150))
        d.rounded_rectangle([x - 18, y, x + 18, y + 44], radius=6, fill=(250, 236, 220), outline=INK, width=3)
        # 撒き餌
        if u > 0.25:
            tp = t
            for i in range(40):
                ph = (tp * 0.35 + i / 40) % 1
                ang2 = i * 2.39
                px = x + math.cos(ang2) * 30 * (1 + ph * 5) + 30
                py = y - 40 + math.sin(ang2) * 40 * ph - ph * 60
                d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=alpha((232, 120, 80), (1 - ph) * min(1, (u - 0.25) * 5)))
        if u > 0.45:
            a = ease((u - 0.45) / 0.15)
            for i in range(7):
                ang2 = t * 1.2 + i * 0.9
                fx = x + 140 + math.cos(ang2) * (120 + i * 12)
                fy = y - 60 + math.sin(ang2) * 70
                fish(d, fx, fy, 56, -1 if math.sin(ang2) > 0 else 1, (60, 100, 140), a)
        if u > 0.75:
            for i in range(3):
                hy = y - 160 + (i * 2 + 1) * 34
                if hy > SURF:
                    jig = 4 * math.sin(t * 40 + i)
                    fish(d, x + 60 + jig, hy + 14, 58, 1, (90, 130, 170))
            fb = F(FONT_BLACK, 64)
            label(d, x + 140, y - 260, "ブルブル！", fb, RED, bg=WHITE)
        return
    # 軌跡
    trail = []
    for k in range(0, 80):
        uu = u * k / 79
        px, pdd, _, _ = action_path(kind, uu)
        trail.append((px, ydepth(pdd)))
    for k in range(0, len(trail) - 1, 2):
        d.line([trail[k], trail[k + 1]], fill=alpha(WHITE, 0.85), width=4)
    # 糸
    d.line([(tipx, tipy), (x, y)], fill=(60, 60, 60), width=2)
    # 追ってくる魚
    hit = False
    if kind in ("fast", "steady", "countdown", "onepitch", "liftfall") and u > 0.55:
        uu = max(0.0, u - 0.07)
        fx, fdd, _, _ = action_path(kind, uu)
        a = ease((u - 0.55) / 0.1)
        if u > 0.86:
            fx, fdd = x + 40, dd
            hit = True
        fish(d, fx + 60, ydepth(fdd) + 6, 130, -1, (40, 90, 130), a)
    # ルアー
    if s.get("lure") == "blade" or kind in ("countdown", "steady"):
        jig_shape(d, x, y, 70, ang + 90 if ang else 0, color=(225, 196, 90))
        bw = 14 * abs(math.cos(t * 16)) + 3
        d.ellipse([x - bw + (34 if ang == -90 else 0), y - 12, x + bw + (34 if ang == -90 else 0), y + 12], fill=(236, 200, 70))
    else:
        jig_shape(d, x, y, 84, ang + 90 if ang else 0)
    if jerking and kind in ("onepitch", "liftfall"):
        fb = F(FONT_BLACK, 52)
        word = "シャクる！" if kind == "onepitch" else "持ち上げる"
        label(d, 560, 290, word, fb, WHITE, bg=RED)
    if kind == "liftfall" and not jerking and u > 0.2 and dd < 0.95:
        fb = F(FONT_BOLD, 40)
        label(d, x + 50, y - 70, "フォールで食う", fb, WHITE, bg=NAVY)
    if hit:
        fb = F(FONT_BLACK, 90)
        sc = 1 + 0.08 * math.sin(t * 20)
        f2 = F(FONT_BLACK, int(90 * sc))
        center_text(d, x + 120, y - 160, "HIT!", f2, RED)
    if kind == "fast" and u < 0.6:
        # ナブラ
        for k in range(14):
            ph = (t * 1.6 + k / 14) % 1
            sx = 700 + (k * 37) % 220
            sy = SURF - math.sin(ph * math.pi) * 50
            d.ellipse([sx - 6, sy - 6, sx + 6, sy + 6], fill=WHITE)
        label(d, 640, SURF - 110, "ナブラ", F(FONT_BOLD, 40), WHITE, bg=NAVY)


def scene_pattern(d, t, dur, s, meta):
    heading(d, s.get("heading", "その日のパターン"))
    rows = s["rows"]
    n = len(rows)
    step = min(0.9, (dur * 0.6) / max(n, 1))
    fw = F(FONT_BOLD, 40)
    fd = F(FONT_BLACK, 44)
    rh = 190 if n <= 4 else 150
    y = 170
    for i, (w, do) in enumerate(rows):
        a = ease((t - 0.3 - i * step) / 0.45)
        if a > 0:
            dx = (1 - a) * 80
            d.rounded_rectangle([30 + dx, y, 400 + dx, y + rh - 30], radius=20, fill=alpha((214, 236, 240), a))
            fw, wl = fit_lines(d, w, FONT_BOLD, [40, 36, 32], 330)
            lh = fw.size + 12
            ty = y + (rh - 30) / 2 - len(wl) * lh / 2
            for j, ln in enumerate(wl):
                d.text((52 + dx, ty + j * lh), ln, font=fw, fill=alpha(NAVY, a))
            ax = 420 + dx
            ay = y + (rh - 30) / 2
            d.polygon([(ax, ay - 22), (ax + 36, ay), (ax, ay + 22)], fill=alpha(RED, a))
            fd, dl = fit_lines(d, do, FONT_BLACK, [46, 42, 38], PW - 520)
            lh = fd.size + 12
            ty = y + (rh - 30) / 2 - len(dl) * lh / 2
            for j, ln in enumerate(dl):
                d.text((480 + dx, ty + j * lh), ln, font=fd, fill=alpha(INK, a))
        y += rh


def scene_points(d, t, dur, s, meta):
    heading(d, s.get("heading", "ポイント"))
    items = s["items"]
    step = min(1.0, (dur * 0.6) / max(len(items), 1))
    f = F(FONT_BOLD, 46)
    y = 190
    for i, txt in enumerate(items):
        a = ease((t - 0.3 - i * step) / 0.4)
        if a > 0:
            d.ellipse([50, y, 120, y + 70], fill=alpha(RED, a))
            c = ease((t - 0.5 - i * step) / 0.3)
            if c > 0:
                p1, p2, p3 = (68, y + 36), (80, y + 50), (104, y + 20)
                if c < 0.5:
                    d.line([p1, (p1[0] + (p2[0] - p1[0]) * c * 2, p1[1] + (p2[1] - p1[1]) * c * 2)], fill=WHITE, width=8)
                else:
                    cc = (c - 0.5) * 2
                    d.line([p1, p2, (p2[0] + (p3[0] - p2[0]) * cc, p2[1] + (p3[1] - p2[1]) * cc)], fill=WHITE, width=8, joint="curve")
            lines = wrap(d, txt, f, PW - 200)
            for j, ln in enumerate(lines):
                d.text((150, y + 4 + j * 60), ln, font=f, fill=alpha(INK, a))
            y += 70 + 60 * len(lines)
        else:
            y += 130


def scene_end(d, t, dur, s, meta):
    d.rounded_rectangle([0, 0, PW, PH], radius=36, fill=NAVY2)
    pts = [(x, 820 + 16 * math.sin(x / 140 + t * 2)) for x in range(0, PW + 1, 8)]
    d.polygon(pts + [(PW, PH), (0, PH)], fill=(20, 60, 104))
    a = ease(t / 0.6)
    logo(d, 180, 170, 130)
    f = F(FONT_BOLD, 50)
    center_text(d, PW / 2, 420, "釣れる時間・釣り場・釣果を", f, alpha(WHITE, a))
    center_text(d, PW / 2, 490, "まとめてチェック", f, alpha(WHITE, a))
    fb = F(FONT_BLACK, 56)
    txt = "「ツレドキ関西」で検索"
    tw = d.textlength(txt, font=fb)
    b = ease((t - 0.5) / 0.5)
    d.rounded_rectangle([PW / 2 - tw / 2 - 36, 620, PW / 2 + tw / 2 + 36, 720], radius=50, fill=alpha(GLOW, b))
    center_text(d, PW / 2, 632, txt, fb, alpha(INK, b))
    fs = F(FONT_REG, 32)
    center_text(d, PW / 2, 760, "tsuredoki-kansai.mametarou0510mame.workers.dev", fs, alpha(MUTED, b))


SCENES = {
    "title": scene_title,
    "tackle": scene_tackle,
    "rig": scene_rig,
    "place": scene_place,
    "action": scene_action,
    "pattern": scene_pattern,
    "points": scene_points,
    "end": scene_end,
}


# ---------- 組み立て ----------
def build_timeline(tl):
    t = 0.0
    out = []
    for s in tl["scenes"]:
        start = t
        cues = []
        c = start + LEAD
        for ln in s["lines"]:
            cues.append((c, c + ln["dur"], ln))
            c += ln["dur"] + GAP
        end = c - GAP + TAIL
        if s["type"] == "title":
            end = max(end, start + 3.5)
        if s["type"] == "end":
            end = max(end, start + 4.0)
        out.append({"scene": s, "start": start, "end": end, "cues": cues})
        t = end
    return out, t


def base_frame(meta, total_scenes, idx, voice):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for i in range(3):
        y = 1820 + i * 30
        pts = [(x, y + 10 * math.sin(x / 160 + i)) for x in range(0, W + 1, 10)]
        d.line(pts, fill=(30, 76, 122), width=4)
    logo(d, 50, 56, 74)
    fb = F(FONT_BOLD, 34)
    tag = "釣り方ガイド"
    tw = d.textlength(tag, font=fb)
    d.rounded_rectangle([W - 70 - tw - 30, 80, W - 70, 136], radius=28, outline=WHITE, width=3)
    d.text((W - 70 - tw - 15, 86), tag, font=fb, fill=WHITE)
    ft = F(FONT_BLACK, 46)
    d.text((56, 178), meta["title"], font=ft, fill=WHITE)
    if voice:
        fc = F(FONT_REG, 26)
        d.text((58, 246), f"音声合成：{voice}", font=fc, fill=MUTED)
    # 進み具合
    seg = (W - 120) / total_scenes
    for i in range(total_scenes):
        col = GLOW if i <= idx else (40, 86, 132)
        d.rounded_rectangle([60 + i * seg + 3, 1680, 60 + (i + 1) * seg - 3, 1692], radius=6, fill=col)
    return img


def draw_caption(img, text, a):
    if not text:
        return
    d = ImageDraw.Draw(img, "RGBA")
    f = F(FONT_BOLD, 52)
    lines = wrap(d, text, f, W - 160)[:3]
    lh = 70
    total = lh * len(lines)
    top = 1360 + (280 - total) / 2
    d.rounded_rectangle([50, top - 26, W - 50, top + total + 18], radius=26, fill=(8, 26, 48, int(230 * a)))
    for i, ln in enumerate(lines):
        w = d.textlength(ln, font=f)
        d.text(((W - w) / 2, top + i * lh), ln, font=f, fill=(255, 255, 255, int(255 * a)))


def render_frame(meta, timeline, idx, t_global, bases):
    item = timeline[idx]
    s = item["scene"]
    t = t_global - item["start"]
    dur = item["end"] - item["start"]
    img = bases[idx].copy()
    layer = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer, "RGBA")
    ld.rounded_rectangle([0, 0, PW, PH], radius=36, fill=PANEL)
    SCENES[s["type"]](ld, t, dur, s, meta)
    # 角を丸く切り抜く
    mask = Image.new("L", (PW, PH), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, PW, PH], radius=36, fill=255)
    a = ease(t / 0.35)
    if a < 1:
        mask = mask.point(lambda v: int(v * a))
    img.paste(layer.convert("RGB"), (PX, PY + int((1 - a) * 40)), mask)
    # 字幕
    cap, ca = None, 0.0
    for c0, c1, ln in item["cues"]:
        if c0 - 0.15 <= t_global <= c1 + GAP:
            cap = ln["text"]
            ca = min(1.0, (t_global - (c0 - 0.15)) / 0.15)
    draw_caption(img, cap, ca)
    return img


def mix_audio(timeline, total, out_path):
    sr = 24000
    buf = np.zeros(int((total + 0.5) * sr), dtype=np.float32)
    for item in timeline:
        for c0, _, ln in item["cues"]:
            if not ln.get("wav"):
                continue
            with wave.open(ln["wav"]) as w:
                assert w.getframerate() == sr and w.getnchannels() == 1
                data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            i0 = int(c0 * sr)
            buf[i0 : i0 + len(data)] += data[: len(buf) - i0]
    buf = np.clip(buf, -1, 1)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())


def main():
    slug = sys.argv[1]
    stills = "--stills" in sys.argv
    d = f"build/video/{slug}"
    tl = json.load(open(f"{d}/timeline.json", encoding="utf-8"))
    meta = {"title": tl["title"], "sub": tl.get("sub", ""), "no": tl.get("no")}
    timeline, total = build_timeline(tl)
    n = len(timeline)
    bases = [base_frame(meta, n, i, tl.get("voice")) for i in range(n)]
    print(f"{slug}: {n} scenes, {total:.1f}s")

    if stills:
        os.makedirs(f"{d}/stills", exist_ok=True)
        for i, item in enumerate(timeline):
            tg = item["start"] + (item["end"] - item["start"]) * 0.75
            render_frame(meta, timeline, i, tg, bases).save(f"{d}/stills/{i:02d}-{item['scene']['type']}.jpg", quality=80)
        return

    os.makedirs("public/videos", exist_ok=True)
    audio = f"{d}/narration.wav"
    has_audio = any(ln.get("wav") for s in tl["scenes"] for ln in s["lines"])
    if has_audio:
        mix_audio(timeline, total, audio)
    out = f"public/videos/{slug}.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if has_audio:
        cmd += ["-i", audio, "-c:a", "aac", "-b:a", "96k"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-shortest" if has_audio else "-an", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    frames = int(total * FPS)
    idx = 0
    for fi in range(frames):
        tg = fi / FPS
        while idx < n - 1 and tg >= timeline[idx]["end"]:
            idx += 1
        frame = render_frame(meta, timeline, idx, tg, bases)
        proc.stdin.write(frame.tobytes())
        if fi == int(timeline[0]["end"] * FPS * 0.7):
            frame.save(f"public/videos/{slug}.jpg", quality=82)
    proc.stdin.close()
    proc.wait()
    print(f"wrote {out} ({os.path.getsize(out) / 1e6:.1f}MB)")


if __name__ == "__main__":
    main()
