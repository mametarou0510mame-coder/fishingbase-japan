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


def appear_at(s, i, default):
    """行を出すタイミング（秒）。長尺動画ではナレーションに合わせた時刻（s["appear"]）を使う"""
    ap = s.get("appear")
    return ap[i] if ap and i < len(ap) else default


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


def fit_font(d, text, path, sizes, maxw):
    for sz in sizes:
        f = F(path, sz)
        if d.textlength(text, font=f) <= maxw:
            return f
    return F(path, sizes[-1])


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
    tag = meta.get("tag") or (f"釣り方ガイド No.{no}" if no else "釣り方ガイド")
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
        a = ease((t - appear_at(s, i, 0.3 + i * step)) / 0.45)
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
            metal_jig(d, cx, 770, 300, 90, t)
        if kind == "blade" and ycut > 620:
            blade_jig(d, cx, 778, 320, 90, t)
            if ycut > 800:
                # 光と振動
                for k in range(3):
                    r = 70 + ((t * 120 + k * 40) % 120)
                    a = 1 - (r - 70) / 120
                    d.arc([cx - r, 910 - r, cx + r, 910 + r], 20, 160, fill=alpha((240, 190, 40), a * 0.8), width=4)
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
            return XS, 0.1 * u / 0.08, 60, False
        v = (u - 0.08) / 0.92
        return XS - (XS - XE) * v, 0.08 + 0.012 * math.sin(v * 60), 0, False
    if kind == "steady":
        if u < 0.25:
            return XS, 0.45 * u / 0.25, 60, False
        v = (u - 0.25) / 0.75
        return XS - (XS - XE) * v, 0.45 - 0.08 * v, 0, False
    if kind == "countdown":
        if u < 0.5:
            return XS, 0.62 * u / 0.5, 60, False
        v = (u - 0.5) / 0.5
        return XS - (XS - XE) * v, 0.6, 0, False
    if kind == "onepitch":
        if u < 0.18:
            return XS, u / 0.18, 60, False
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
            return x, dd, -35, True
        r = (w - 0.35) / 0.65
        return xk - dx * (0.8 + 0.2 * r), Lk - step * 1.3 + step * 0.3 * r, 15, False
    if kind == "liftfall":
        if u < 0.15:
            return XS, u / 0.15, 60, False
        n = 4
        v = (u - 0.15) / 0.85 * n
        k = min(int(v), n - 1)
        w = v - k
        dx = (XS - XE) / n
        xk = XS - dx * k
        if w < 0.3:
            e = ease(w / 0.3)
            return xk - dx * 0.5 * e, 1 - 0.5 * e, -45, True
        r = (w - 0.3) / 0.7
        return xk - dx * (0.5 + 0.5 * r), 0.5 + 0.5 * r ** 1.4, 35, False
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
    fn = fit_font(d, s.get("name", ""), FONT_BLACK, [58, 52, 46, 40], PW - 290)
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
    lk0 = s.get("lure") or ("blade" if kind in ("countdown", "steady") else "jig")
    d.line([(tipx, tipy), lure_eye(lk0, x, y, ang, 80)], fill=(60, 60, 60), width=2)
    # 追ってくる魚
    hit = False
    if kind in ("fast", "steady", "countdown", "onepitch", "liftfall") and u > 0.55:
        uu = max(0.0, u - 0.07)
        fx, fdd, _, _ = action_path(kind, uu)
        a = ease((u - 0.55) / 0.1)
        if u > 0.86:
            fx, fdd = x + 110, dd
            hit = True
        fish(d, fx + 140 if not hit else fx + 60, ydepth(fdd) + 6, 130, -1, (40, 90, 130), a)
    # ルアー
    lure(d, s.get("lure") or ("blade" if kind in ("countdown", "steady") else "jig"), x, y, ang, 80, t)
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
        a = ease((t - appear_at(s, i, 0.3 + i * step)) / 0.45)
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
        a = ease((t - appear_at(s, i, 0.3 + i * step)) / 0.4)
        if a > 0:
            d.ellipse([50, y, 120, y + 70], fill=alpha(RED, a))
            c = ease((t - appear_at(s, i, 0.3 + i * step) - 0.2) / 0.3)
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


# ---------- 追加：生き物・ルアー・仕掛けの部品 ----------
NIGHT_SKY = (24, 38, 66)
NIGHT_SEA = (36, 78, 120)
NIGHT_DEEP = (22, 52, 88)
PINK = (238, 120, 150)
ORANGE = (240, 140, 50)
LEAD_GRAY = (120, 126, 134)

FISH_COLORS = {
    "aomono": ((40, 90, 130), 130),
    "kisu": ((222, 200, 160), 80),
    "haze": ((160, 140, 100), 70),
    "gashira": ((176, 82, 58), 90),
    "chinu": ((96, 104, 114), 120),
    "aji": ((90, 130, 170), 70),
    "mebaru": ((120, 84, 70), 80),
    "suzuki": ((150, 170, 190), 140),
    "sayori": ((120, 170, 160), 90),
    "kawahagi": ((186, 160, 110), 80),
    "sawara": ((120, 150, 180), 140),
}


def rot(pts, cx, cy, deg):
    r = math.radians(deg)
    c, s_ = math.cos(r), math.sin(r)
    return [(cx + px * c - py * s_, cy + px * s_ + py * c) for px, py in pts]


def creature(d, kind, x, y, facing=-1, a=1.0, t=0.0, scale=1.0):
    if kind == "tachiuo":
        L = 220 * scale
        pts = [(x + facing * (-L / 2 + L * i / 24) * -1, y + 7 * math.sin(i / 3 + t * 6)) for i in range(25)]
        d.line(pts, fill=alpha((214, 224, 234), a), width=int(18 * scale), joint="curve")
        hx, hy = pts[0]
        d.ellipse([hx - 4, hy - 6, hx + 4, hy + 2], fill=alpha(INK, a))
        return
    if kind == "ika":
        s = 120 * scale
        body = [(-s * 0.1, -s * 0.16), (s * 0.55, -s * 0.06), (s * 0.62, 0), (s * 0.55, s * 0.06), (-s * 0.1, s * 0.16)]
        fins = [(s * 0.35, -s * 0.05), (s * 0.62, -s * 0.2), (s * 0.62, s * 0.2), (s * 0.35, s * 0.05)]
        sign = -facing  # 頭（足）が進む向き
        bp = [(x + sign * px * -1, y + py) for px, py in body]
        fp = [(x + sign * px * -1, y + py) for px, py in fins]
        d.polygon(fp, fill=alpha((230, 200, 190), a * 0.9))
        d.polygon(bp, fill=alpha((240, 214, 204), a), outline=alpha((200, 150, 140), a))
        for k in range(5):
            yy = y - s * 0.12 + k * s * 0.06
            d.line([(x - sign * s * 0.1 * -1, y + (k - 2) * s * 0.04), (x + sign * s * 0.45 * -1 * -1, yy + 4 * math.sin(t * 5 + k))], fill=alpha((220, 170, 160), a), width=4)
        ex = x - sign * s * 0.02 * -1
        d.ellipse([ex - 6, y - 6, ex + 6, y + 6], fill=alpha(INK, a))
        return
    if kind == "tako":
        s = 110 * scale
        d.ellipse([x - s * 0.3, y - s * 0.75, x + s * 0.3, y - s * 0.15], fill=alpha((176, 70, 70), a))
        for k in range(6):
            ang = math.radians(200 + k * 28)
            pts = []
            for j in range(8):
                rr = s * 0.2 + j * s * 0.08
                pts.append((x + math.cos(ang) * rr + 4 * math.sin(t * 4 + j + k), y - s * 0.15 - math.sin(ang) * rr * 0.4 + j * 3))
            d.line(pts, fill=alpha((176, 70, 70), a), width=int(9 * scale), joint="curve")
        d.ellipse([x - 14, y - s * 0.5, x - 4, y - s * 0.4], fill=alpha(WHITE, a))
        return
    col, size = FISH_COLORS.get(kind, ((60, 100, 140), 100))
    fish(d, x, y, size * scale, facing, col, a)
    if kind == "gashira":
        d.polygon([(x - 20, y - 16), (x + 20, y - 16), (x, y - 34)], fill=alpha(col, a))


def lure(d, kind, x, y, ang=0.0, s=80, t=0.0):
    """ルアー・エサを横向き（頭が左＝釣り人の方）で描く。ang は傾き（度、正で頭が下）"""
    ang = -ang  # 画面の回転は時計回りが正なので、頭が下がる向きにそろえる
    if kind == "jig":
        metal_jig(d, x, y, s * 2.0, ang, t)
        return
    if kind == "blade":
        blade_jig(d, x, y, s * 2.6, ang, t)
        return
    if kind == "pencil":
        minnow_plug(d, x, y, s * 1.9, ang, t, lip=False, back=(70, 90, 160))
        return
    if kind == "egi" or kind == "takoegi":
        body = [(-s * 0.5, 0), (-s * 0.3, -s * 0.14), (s * 0.35, -s * 0.12), (s * 0.45, 0), (s * 0.35, s * 0.12), (-s * 0.3, s * 0.14)]
        col = ORANGE if kind == "egi" else (245, 245, 245)
        d.polygon(rot(body, x, y, ang), fill=col, outline=INK)
        d.polygon(rot([(-s * 0.3, -s * 0.14), (s * 0.35, -s * 0.12), (s * 0.3, -s * 0.04), (-s * 0.3, -s * 0.05)], x, y, ang), fill=(200, 60, 40) if kind == "egi" else (220, 60, 60))
        ex, ey = rot([(-s * 0.36, -s * 0.02)], x, y, ang)[0]
        d.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=INK)
        tx, ty = rot([(s * 0.45, 0)], x, y, ang)[0]
        n = 6 if kind == "egi" else 2
        for k in range(n):
            a2 = ang + (k - (n - 1) / 2) * (22 if kind == "egi" else 50)
            ex2, ey2 = rot([(s * 0.18, 0)], tx, ty, a2)[0]
            d.line([(tx, ty), (ex2, ey2)], fill=INK, width=3 if kind == "egi" else 5)
        if kind == "takoegi":
            sx, sy = rot([(-s * 0.1, s * 0.25)], x, y, ang)[0]
            d.ellipse([sx - 12, sy - 10, sx + 12, sy + 10], fill=LEAD_GRAY)
        return
    if kind in ("jighead", "wind"):
        d.ellipse([x - s * 0.14, y - s * 0.14, x + s * 0.14, y + s * 0.14], fill=(230, 60, 60) if kind == "wind" else LEAD_GRAY)
        pts = [(x + s * 0.1 + s * 0.8 * i / 10, y + 4 * math.sin(i + t * 10)) for i in range(11)]
        pts = rot([(px - x, py - y) for px, py in pts], x, y, ang)
        d.line(pts, fill=(250, 220, 120) if kind == "wind" else (200, 230, 240), width=int(s * 0.14), joint="curve")
        return
    if kind == "minnow":
        minnow_plug(d, x, y, s * 1.9, ang, t)
        return
    if kind == "tenya":
        d.polygon(rot([(-s * 0.5, -s * 0.1), (-s * 0.25, -s * 0.12), (-s * 0.25, s * 0.12), (-s * 0.5, s * 0.06)], x, y, ang), fill=LEAD_GRAY)
        d.polygon(rot([(-s * 0.25, -s * 0.09), (s * 0.4, -s * 0.05), (s * 0.55, 0), (s * 0.4, s * 0.05), (-s * 0.25, s * 0.09)], x, y, ang), fill=SILVER, outline=INK)
        hx, hy = rot([(-s * 0.2, s * 0.12)], x, y, ang)[0]
        d.arc([hx - 14, hy - 4, hx + 14, hy + 24], 0, 180, fill=INK, width=4)
        return
    if kind == "bait":
        pts = [(x + s * 0.4 * i / 8 - s * 0.2, y + 6 * math.sin(i * 1.2 + t * 8)) for i in range(9)]
        d.line(pts, fill=PINK, width=max(5, int(s * 0.1)), joint="curve")
        hook(d, x - s * 0.2, y - s * 0.12, max(18, s * 0.2), INK, max(3, int(s / 40)))
        return
    if kind == "kibinago":
        L = s
        body = [(-L * 0.45, 0), (-L * 0.3, -L * 0.09), (L * 0.35, -L * 0.05), (L * 0.45, 0), (L * 0.35, L * 0.05), (-L * 0.3, L * 0.09)]
        d.polygon(rot(body, x, y, ang), fill=(210, 222, 234), outline=(90, 110, 130))
        d.line(rot([(-L * 0.3, 0), (L * 0.35, 0)], x, y, ang), fill=(80, 150, 200), width=3)
        d.line(rot([(-L * 0.6, 0), (-L * 0.45, 0)], x, y, ang), fill=(150, 150, 160), width=3)
        hx, hy = rot([(-L * 0.1, L * 0.1)], x, y, ang)[0]
        d.arc([hx - 12, hy - 4, hx + 12, hy + 20], 0, 180, fill=INK, width=3)
        return
    if kind == "live":
        fish(d, x, y, s * 0.8, -1 if math.sin(t * 2) > 0 else 1, (110, 150, 190))
        return
    if kind == "kani":
        d.ellipse([x - s * 0.18, y - s * 0.12, x + s * 0.18, y + s * 0.12], fill=(170, 90, 60))
        for k in range(3):
            for sg in (-1, 1):
                d.line([(x + sg * s * 0.14, y - s * 0.04 + k * s * 0.06), (x + sg * s * 0.3, y + k * s * 0.06)], fill=(170, 90, 60), width=3)
        return
    if kind == "burakuri":
        d.ellipse([x - s * 0.14, y - s * 0.2, x + s * 0.14, y + s * 0.12], fill=(220, 50, 50))
        hook(d, x, y + s * 0.1, max(18, s * 0.2), INK, 3)
        lure(d, "bait", x + s * 0.1, y + s * 0.38, 0, s * 0.7, t)
        return
    if kind == "tenbin":
        d.line([(x, y), (x, y - s * 0.4), (x + s * 0.7, y - s * 0.4)], fill=INK, width=3)
        d.ellipse([x - s * 0.12, y - s * 0.05, x + s * 0.12, y + s * 0.2], fill=LEAD_GRAY)
        d.line([(x + s * 0.7, y - s * 0.4), (x + s * 1.2, y - s * 0.1)], fill=(150, 190, 230), width=3)
        lure(d, "bait", x + s * 1.3, y - s * 0.1, 0, s * 0.6, t)
        return
    if kind == "dotsuki":
        d.line([(x, y - s * 0.8), (x, y)], fill=(120, 120, 120), width=3)
        for k in range(2):
            by = y - s * 0.7 + k * s * 0.35
            d.line([(x, by), (x + s * 0.3, by + 10)], fill=(150, 190, 230), width=3)
            lure(d, "bait", x + s * 0.42, by + 14, 0, s * 0.5, t)
        d.ellipse([x - 12, y, x + 12, y + 26], fill=LEAD_GRAY)
        return
    fish(d, x, y, s, -1, (110, 150, 190))


def lure_eye(kind, x, y, tilt=0.0, s=80):
    """lure() で描いたルアー・エサの、糸を結ぶ位置（アイ）"""
    a = -tilt
    if kind == "jig":
        L = s * 2.0
        p = (-L / 2 - L * 0.035, 0)
    elif kind == "blade":
        L = s * 2.6
        bl = L * 0.62
        p = (-L * 0.19 - bl / 2 - bl * 0.035, 0)
    elif kind == "minnow":
        L = s * 1.9
        p = (-L * 0.6, L * 0.17 * 1.25)
    elif kind == "pencil":
        p = (-s * 1.9 * 0.5, 0)
    elif kind in ("egi", "takoegi", "tenya"):
        p = (-s * 0.5, 0)
    elif kind in ("jighead", "wind"):
        p = (-s * 0.14, 0)
    elif kind == "kibinago":
        p = (-s * 0.6, 0)
    elif kind == "tenbin":
        p = (0, -s * 0.4)
    elif kind == "bait":
        p = (-s * 0.2, -s * 0.12)
    elif kind == "burakuri":
        p = (0, -s * 0.2)
    elif kind == "dotsuki":
        p = (0, -s * 0.8)
    elif kind == "kani":
        p = (0, -s * 0.12)
    elif kind == "live":
        p = (-s * 0.25, -s * 0.05)
    else:
        p = (0, 0)
    if kind in ("tenbin", "burakuri", "dotsuki", "kani", "bait", "live"):
        return x + p[0], y + p[1]  # 傾けずに描くエサ・仕掛け
    return rot([p], x, y, a)[0]


PART_SIZE = {"egi": 150, "takoegi": 150, "jighead": 130, "wind": 140, "tenya": 170, "bait": 180, "live": 160, "kani": 160, "burakuri": 220, "tenbin": 180, "dotsuki": 190, "kibinago": 170, "jig": 120, "blade": 100, "minnow": 110, "pencil": 110}
HANG_UP = {"jig", "blade", "minnow", "pencil", "egi", "takoegi", "jighead", "wind", "tenya", "kibinago"}


# 縦に並べた仕掛けの部品（rig シーンの parts で使う）
def part(d, kind, cx, y, t):
    if kind == "pe":
        for yy in range(int(y - 50), int(y + 50), 18):
            d.line([(cx, yy), (cx, yy + 10)], fill=(90, 170, 60), width=5)
    elif kind == "nylon":
        d.line([(cx, y - 50), (cx, y + 50)], fill=(110, 110, 110), width=4)
    elif kind in ("leader", "harisu"):
        d.line([(cx, y - 50), (cx, y + 50)], fill=(150, 190, 230), width=8 if kind == "leader" else 5)
    elif kind == "wire":
        d.line([(cx, y - 50), (cx, y + 50)], fill=(150, 150, 160), width=5)
    elif kind == "knot":
        d.ellipse([cx - 14, y - 14, cx + 14, y + 14], fill=RED)
    elif kind == "stopper":
        d.rectangle([cx - 14, y - 22, cx + 14, y - 12], fill=GLOW)
        d.ellipse([cx - 9, y + 2, cx + 9, y + 20], fill=RED)
    elif kind == "swivel":
        d.ellipse([cx - 9, y - 22, cx + 9, y - 2], outline=INK, width=4)
        d.ellipse([cx - 9, y + 2, cx + 9, y + 22], outline=INK, width=4)
    elif kind == "snap":
        d.ellipse([cx - 14, y - 20, cx + 14, y + 20], outline=INK, width=5)
    elif kind == "float":
        d.line([(cx, y - 70), (cx, y - 40)], fill=INK, width=4)
        d.chord([cx - 30, y - 50, cx + 30, y + 10], 180, 360, fill=RED)
        d.chord([cx - 30, y - 50, cx + 30, y + 10], 0, 180, fill=WHITE, outline=INK)
        d.ellipse([cx - 30, y - 50, cx + 30, y + 10], outline=INK, width=3)
        d.line([(cx, y + 10), (cx, y + 50)], fill=INK, width=4)
    elif kind == "efloat":
        g = 0.5 + 0.5 * math.sin(t * 5)
        for r in (44, 32, 22):
            d.ellipse([cx - r, y - 70 - r, cx + r, y - 70 + r], fill=alpha((150, 255, 120), 0.12 + 0.1 * g))
        d.rounded_rectangle([cx - 8, y - 80, cx + 8, y - 56], radius=6, fill=(140, 240, 110))
        d.rounded_rectangle([cx - 16, y - 56, cx + 16, y + 50], radius=14, fill=(250, 140, 40), outline=INK, width=3)
    elif kind == "sinker":
        d.polygon([(cx, y - 30), (cx + 20, y + 10), (cx, y + 30), (cx - 20, y + 10)], fill=LEAD_GRAY)
    elif kind == "gan":
        d.ellipse([cx - 12, y - 12, cx + 12, y + 12], fill=LEAD_GRAY)
    elif kind == "cage":
        d.rounded_rectangle([cx - 36, y - 46, cx + 36, y + 46], radius=10, fill=(255, 210, 160), outline=INK, width=4)
        for gx in range(-24, 30, 16):
            d.line([(cx + gx, y - 40), (cx + gx, y + 40)], fill=(200, 150, 100), width=2)
    elif kind == "hook":
        hook(d, cx, y - 40, 60, INK, 6)
    elif kind == "renfloat":
        d.line([(cx, y - 60), (cx, y + 60)], fill=(110, 110, 110), width=3)
        for k in range(4):
            fy = y - 48 + k * 32
            d.ellipse([cx - 13, fy - 11, cx + 13, fy + 11], fill=(250, 200, 40) if k % 2 == 0 else RED, outline=INK, width=2)
    elif kind == "sabiki":
        d.line([(cx, y - 60), (cx, y + 60)], fill=(150, 150, 150), width=3)
        for k in range(3):
            by = y - 50 + k * 40
            sd = 1 if k % 2 == 0 else -1
            d.line([(cx, by), (cx + sd * 50, by + 14)], fill=(150, 150, 150), width=3)
            hook(d, cx + sd * 54, by + 12, 24, INK, 3)
            d.polygon([(cx + sd * 50, by + 6), (cx + sd * 80, by - 4), (cx + sd * 80, by + 22)], fill=PINK)
    else:
        size = PART_SIZE.get(kind, 90)
        tilt = -90 if kind in HANG_UP else 0
        ex, ey = lure_eye(kind, cx, y, tilt, size)
        lx, ly = cx + (cx - ex), y + (y - ey)  # アイが (cx, y) に来るように中心をずらす
        lure(d, kind, lx, ly, tilt, size, t)
        return ly
    return y


def scene_rig_parts(d, t, dur, s, meta):
    heading(d, s.get("heading", "仕掛け"))
    parts = s["parts"]
    n = len(parts)
    cx = 300
    top, bottom = 200, 920
    gap = (bottom - top) / max(n - 1, 1)
    prog = ease(t / max(1.5, dur * 0.55))
    shown = prog * n
    fl = F(FONT_BOLD, 40)
    last = parts[-1][0]
    if last in PART_SIZE:
        lsz = PART_SIZE[last]
        ex, ey = lure_eye(last, 0, 0, -90 if last in HANG_UP else 0, lsz)
        bottom = min(bottom, PH - 70 + 2 * ey)  # ぶら下がるルアーがパネルに収まるように
        gap = (bottom - top) / max(n - 1, 1)
    ys = [top + i * gap for i in range(n)]
    for i in range(n - 1):
        if shown > i + 1:
            d.line([(cx, ys[i]), (cx, ys[i + 1])], fill=(170, 170, 170), width=3)
    for i, (kind, txt) in enumerate(parts):
        a = clamp01(shown - i)
        if a <= 0:
            break
        ly = part(d, kind, cx, ys[i], t) or ys[i]
        lx = 520
        d.line([(cx + 70, ly), (lx - 16, ly)], fill=alpha(MUTED, a), width=3)
        f2 = fl if d.textlength(txt, font=fl) < PW - lx - 30 else F(FONT_BOLD, 32)
        label(d, lx, ly - 22, txt, f2, alpha(INK, a), bg=alpha(WHITE, a))


# --- 追加のアクション ---
def stage(d, t, s, jerk=False, rod_up=False):
    night = s.get("night", False)
    sky = NIGHT_SKY if night else PANEL
    sea = NIGHT_SEA if night else SEA
    deep = NIGHT_DEEP if night else SEA_DEEP
    d.rectangle([0, 130, PW, SURF], fill=sky)
    if night:
        for k in range(12):
            sx, sy = (k * 157) % PW, 150 + (k * 71) % 150
            d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=alpha(WHITE, 0.6))
    d.rectangle([0, SURF, PW, PH], fill=sea)
    d.rectangle([0, SURF + 260, PW, PH], fill=alpha(deep, 0.45))
    pts = [(x, SURF + 6 * math.sin(x / 50 + t * 3)) for x in range(0, PW + 1, 8)]
    d.line(pts, fill=alpha(WHITE, 0.8), width=4)
    sand = [(x, BOT + 10 * math.sin(x / 90)) for x in range(0, PW + 1, 10)]
    d.polygon(sand + [(PW, PH), (0, PH)], fill=SAND)
    d.rectangle([0, SURF - 60, 150, PH], fill=CONCRETE)
    if s.get("light"):
        d.line([(130, SURF - 60), (130, SURF - 300)], fill=(80, 80, 90), width=8)
        d.ellipse([110, SURF - 320, 160, SURF - 290], fill=(255, 230, 120))
        d.polygon([(135, SURF - 300), (520, BOT), (150, BOT)], fill=alpha((255, 240, 160), 0.16))
    ink = (230, 236, 244) if night else INK
    d.ellipse([60, SURF - 190, 96, SURF - 154], fill=ink)
    d.line([(78, SURF - 154), (78, SURF - 90)], fill=ink, width=8)
    d.line([(78, SURF - 90), (62, SURF - 60)], fill=ink, width=7)
    d.line([(78, SURF - 90), (96, SURF - 60)], fill=ink, width=7)
    rod_ang = -75 if (jerk or rod_up) else -35
    rx0, ry0 = 90, SURF - 120
    tipx = rx0 + 170 * math.cos(math.radians(rod_ang))
    tipy = ry0 + 170 * math.sin(math.radians(rod_ang))
    d.line([(rx0, ry0), (tipx, tipy)], fill=(200, 200, 200) if night else (40, 40, 40), width=7)
    d.line([(78, SURF - 140), (rx0, ry0)], fill=ink, width=6)
    fn = fit_font(d, s.get("name", ""), FONT_BLACK, [58, 52, 46, 40], PW - 290)
    fs = F(FONT_BOLD, 38)
    d.rectangle([0, 0, PW, 128], fill=PANEL)
    heading(d, s.get("heading", "アクション"))
    nm_col = (255, 140, 120) if night else RED
    d.text((260, 136), s.get("name", ""), font=fn, fill=nm_col)
    d.text((262, 210), s.get("sub", ""), font=fs, fill=WHITE if night else INK)
    return tipx, tipy


def callouts(d, s, u, t):
    for c in s.get("callouts", []):
        if c[0] <= u < c[1]:
            fb = F(FONT_BLACK, 48)
            for sz in (48, 42, 36, 32):
                fb = F(FONT_BLACK, sz)
                if d.textlength(c[2], font=fb) <= PW - 300:
                    break
            w = d.textlength(c[2], font=fb)
            label(d, PW - 40 - w, 290, c[2], fb, WHITE, bg=RED)
    if u > 0.86 and s.get("hit"):
        sc = 1 + 0.08 * math.sin(t * 20)
        return F(FONT_BLACK, int(84 * sc))
    return None


def scene_action2(d, t, dur, s, meta):
    kind = s["kind"]
    u = clamp01((t - 0.2) / max(1.0, dur - 0.6))
    who = s.get("fish", "aomono")
    lk = s.get("lure", "bait")
    jerk = False
    trail = True
    if kind == "uki":
        fx_end = 640
        if u < 0.12:
            v = u / 0.12
            fx = 200 + (fx_end - 200) * v
            fy = SURF - 200 * math.sin(math.pi * v)
        else:
            fx, fy = fx_end, SURF + 4 * math.sin(t * 3)
        tana = s.get("tana", 0.45)
        by = ydepth(tana)
        sink = 0.0
        if u > 0.68:
            sink = min(60, (u - 0.68) * 600)
        tipx, tipy = stage(d, t, s, rod_up=u > 0.82)
        d.line([(tipx, tipy), (fx, fy - 30 + sink)], fill=(90, 90, 90), width=2)
        if u >= 0.12:
            bex, bey = lure_eye(lk, fx, by, 0, 90)
            d.line([(fx, fy + sink), (fx, bey - 30), (bex, bey)], fill=(120, 120, 120), width=2)
            for yy in range(int(fy + 30), int(by - 20), 22):
                d.line([(fx + 40, yy), (fx + 40, yy + 10)], fill=alpha(WHITE, 0.8), width=3)
            label(d, fx + 54, (fy + by) / 2 - 20, "タナ", F(FONT_BOLD, 36), WHITE, bg=alpha(NAVY, 0.9))
            lure(d, lk, fx, by, 0, 90, t)
            if u > 0.4:
                a = ease((u - 0.4) / 0.1)
                cx = fx + 260 - 200 * clamp01((u - 0.4) / 0.3)
                creature(d, who, cx + 40, by + 10, -1, a, t)
        part(d, "efloat" if s.get("night") else "float", fx, fy + sink + 10, t)
        hitf = callouts(d, s, u, t)
        if hitf:
            center_text(d, fx + 120, fy - 180, s["hit"], hitf, RED)
        return
    if kind == "vertical":
        wall = s.get("mode") == "wall"
        tipx, tipy = stage(d, t, s, jerk=False)
        if not wall:
            for k, (rx, rw) in enumerate([(170, 120), (330, 150), (520, 130)]):
                d.ellipse([rx - rw / 2, BOT - 120 + (k % 2) * 30, rx + rw / 2, BOT + 40], fill=(130, 136, 146), outline=(90, 96, 106), width=3)
            x = 255
            depth = 0.82 * clamp01(u / 0.3)
            if 0.3 < u < 0.7:
                depth -= 0.03 * abs(math.sin(t * 4))
        else:
            for k in range(14):
                my = SURF + 30 + k * 40
                d.ellipse([150, my, 172, my + 30], fill=(40, 50, 80))
            x = 190
            depth = 0.85 * clamp01((u - 0.05) / 0.75)
        y = ydepth(depth)
        ex, ey = lure_eye(lk, x, y, 0, 80)
        d.line([(tipx, tipy), (ex, SURF), (ex, ey)], fill=(90, 90, 90), width=2)
        lure(d, lk, x, y, 0, 80, t)
        if u > 0.45:
            a = ease((u - 0.45) / 0.15)
            if wall:
                cx = x + 120 - 80 * clamp01((u - 0.45) / 0.3)
                creature(d, who, cx + 20, y + 10, -1, a, t)
            else:
                rise = 60 * clamp01((u - 0.45) / 0.25)
                creature(d, who, x + 30, BOT - 30 - rise, -1, a, t)
        hitf = callouts(d, s, u, t)
        if hitf:
            center_text(d, x + 220, y - 160, s["hit"], hitf, RED)
        return

    # 以下は「投げて引いてくる」型。path(u) -> (x, depth, ang, jerk)
    def path(uu):
        if kind == "drag":
            if uu < 0.12:
                return 860, uu / 0.12, 0, False
            v = (uu - 0.12) / 0.88
            n = 5
            k = min(int(v * n), n - 1)
            w = v * n - k
            mv = ease(min(1, w / 0.5))
            x = 860 - (860 - 320) * (k + mv) / n
            return x, 1.0, 0, False
        if kind == "eging":
            if uu < 0.25:
                return 860, uu / 0.25, 0, False
            v = (uu - 0.25) / 0.75
            n = 2
            k = min(int(v * n), n - 1)
            w = v * n - k
            x0 = 860 - 260 * k
            if w < 0.3:
                jk = int(w / 0.15)
                ww = (w % 0.15) / 0.15
                lift = 0.25 * (jk + ease(ww))
                return x0 - 80 * (jk + ease(ww)) / 2, 1 - lift, -30, ww < 0.6
            r = (w - 0.3) / 0.7
            return x0 - 80 - 180 * r, 0.5 + 0.5 * r, 18, False
        if kind == "drift":
            if uu < 0.08:
                return 820, 0.02, 0, False
            v = (uu - 0.08) / 0.92
            return 820 - 540 * v, 0.02 + 0.55 * (1 - (1 - v) ** 2), 15 * (1 - v), False
        if kind == "wind":
            if uu < 0.15:
                return 860, 0.45 * uu / 0.15, 0, False
            v = (uu - 0.15) / 0.85
            n = 8
            k = min(int(v * n), n - 1)
            w = v * n - k
            base = 0.45 - 0.1 * (k / n)
            x = 860 - (860 - 300) * (k + w) / n
            if w < 0.3:
                return x, base - 0.12 * ease(w / 0.3) * (1 if k % 2 == 0 else 0.6), -35 if k % 2 == 0 else -20, True
            return x, base - 0.12 * (1 - (w - 0.3) / 0.7) * (1 if k % 2 == 0 else 0.6), 20, False
        if kind == "tenya":
            if uu < 0.15:
                return 820, 0.5 * uu / 0.15, 0, False
            v = (uu - 0.15) / 0.85
            n = 4
            k = min(int(v * n), n - 1)
            w = v * n - k
            x0 = 820 - 110 * k
            if w < 0.35:
                e = ease(w / 0.35)
                return x0 - 60 * e, 0.5 - 0.18 * e, -20, True
            r = (w - 0.35) / 0.65
            return x0 - 60 - 50 * r, 0.32 + 0.18 * r, 10, False
        if kind == "tako":
            x0, x1 = 600, 200
            if uu < 0.15:
                return x0, uu / 0.15, 0, False
            v = (uu - 0.15) / 0.85
            x = x0 - (x0 - x1) * min(1, v * 1.2)
            return x, 0.97 - 0.02 * abs(math.sin(uu * 80)), 0, (int(uu * 40) % 2 == 0)
        if kind == "retrieve":
            dep = s.get("depth", 0.25)
            if uu < 0.12:
                return 860, dep * uu / 0.12, 0, False
            v = (uu - 0.12) / 0.88
            return 860 - 600 * v, dep, 0, False
        return 860, 0.5, 0, False

    x, dd, ang, jerk = path(u)
    y = ydepth(dd)
    tipx, tipy = stage(d, t, s, jerk=jerk)
    if kind == "drift" and s.get("light"):
        pass
    pts = [path(u * k / 59) for k in range(60)]
    tr = [(p[0], ydepth(p[1])) for p in pts]
    for k in range(0, len(tr) - 1, 2):
        d.line([tr[k], tr[k + 1]], fill=alpha(WHITE, 0.7), width=4)
    d.line([(tipx, tipy), lure_eye(lk, x, y, ang, 80)], fill=(90, 90, 90) if not s.get("night") else (200, 200, 200), width=2)
    if kind == "drag" and dd > 0.95:
        for k in range(6):
            ph = (t * 1.5 + k / 6) % 1
            d.ellipse([x + 10 + ph * 50, y + 10 - ph * 30, x + 18 + ph * 50, y + 18 - ph * 30], fill=alpha(SAND, 1 - ph))
    # 生き物
    if u > 0.5:
        a = ease((u - 0.5) / 0.12)
        if u > 0.86:
            cxp, cyp = x + 150, y
        else:
            px, pdd, _, _ = path(max(0.0, u - 0.06))
            cxp, cyp = px + 170, ydepth(pdd) + 8
        if kind == "tako":
            cxp, cyp = (x + 40, y + 20) if u > 0.6 else (x - 60, BOT + 5)
            a = 1.0
        creature(d, who, cxp, cyp, -1, a, t)
    elif kind == "tako":
        creature(d, who, 140 + 80, BOT + 5, -1, 1.0, t)
    lure(d, lk, x, y, ang, 80, t)
    hitf = callouts(d, s, u, t)
    if hitf:
        center_text(d, x + 140, y - 170, s["hit"], hitf, RED)


NEW_ACTIONS = {"uki", "vertical", "drag", "eging", "drift", "wind", "tenya", "tako", "retrieve"}


# --- ユニノット（結び方の4段階）---
def scene_knot(d, t, dur, s, meta):
    heading(d, s.get("heading", "結び方"))
    steps = s.get("steps", ["輪に通して折り返す", "輪を作る", "輪の中に5回くぐらせる", "締めて余りを切る"])
    step = (dur * 0.7) / len(steps)
    fl = F(FONT_BOLD, 34)
    fn = F(FONT_BLACK, 40)
    for i, txt in enumerate(steps):
        a = ease((t - appear_at(s, i, 0.3 + i * step)) / 0.4)
        if a <= 0:
            continue
        col, row = i % 2, i // 2
        x0, y0 = 30 + col * 470, 150 + row * 430
        d.rounded_rectangle([x0, y0, x0 + 450, y0 + 410], radius=20, fill=alpha(WHITE, a), outline=alpha((200, 214, 228), a), width=3)
        d.ellipse([x0 + 16, y0 + 16, x0 + 70, y0 + 70], fill=alpha(RED, a))
        center_text(d, x0 + 43, y0 + 18, str(i + 1), fn, alpha(WHITE, a))
        ex, ey = x0 + 90, y0 + 190  # 針の環（アイ）
        d.ellipse([ex - 16, ey - 16, ex + 16, ey + 16], outline=alpha(INK, a), width=6)
        d.line([(ex - 16, ey), (ex - 70, ey)], fill=alpha(INK, a), width=8)
        main = alpha((60, 120, 200), a)
        tag = alpha((230, 90, 60), a)
        d.line([(ex, ey), (x0 + 430, ey - 30)], fill=main, width=5)
        if i == 0:
            d.line([(ex, ey), (x0 + 380, ey + 40)], fill=tag, width=5)
        elif i in (1, 2):
            d.line([(ex, ey), (x0 + 330, ey + 30)], fill=tag, width=5)
            d.arc([x0 + 220, ey - 80, x0 + 400, ey + 40], 200, 520 if i == 1 else 380, fill=tag, width=5)
            if i == 2:
                for k in range(5):
                    cx = x0 + 180 + k * 26
                    d.ellipse([cx - 12, ey - 40, cx + 12, ey + 30], outline=tag, width=4)
        else:
            d.rounded_rectangle([ex + 18, ey - 20, ex + 110, ey + 14], radius=10, fill=tag)
            d.line([(ex + 110, ey - 3), (ex + 130, ey + 10)], fill=tag, width=4)
        lines = wrap(d, txt, fl, 410)
        for j, ln in enumerate(lines[:2]):
            d.text((x0 + 22, y0 + 300 + j * 46), ln, font=fl, fill=alpha(INK, a))


# ---------- ルアーの詳しい絵（ローカル座標：頭が -x、背中が -y。a は回転角度・度） ----------
JIG_BACK = (40, 96, 190)
JIG_BELLY = (226, 232, 240)
HOLO = [(255, 120, 200), (120, 230, 255), (255, 240, 120)]
GOLD = (226, 186, 70)
GOLD_DARK = (150, 110, 20)
LIP = (200, 232, 248)


def _tf(pts, x, y, a):
    return rot(pts, x, y, a)


def _contour(L, H, prof, n=24):
    up, lo = [], []
    for i in range(n + 1):
        tt = i / n
        px = -L / 2 + L * tt
        hu, hl = prof(tt)
        up.append((px, -H * hu))
        lo.append((px, H * hl))
    return up, lo


def _jhook(d, x, y, a, ax, ay, s, flip=1, w=4):
    pts = []
    pts.append((ax, ay))
    pts.append((ax + s * 0.7, ay))
    cx, cy, r = ax + s * 0.7, ay + flip * s * 0.28, s * 0.28
    for k in range(0, 181, 15):
        th = math.radians(k)
        pts.append((cx + r * math.sin(th), cy - flip * r * math.cos(th)))
    lx, ly = pts[-1]
    pts.append((lx - s * 0.2, ly - flip * s * 0.12))
    d.line(_tf(pts, x, y, a), fill=(60, 64, 70), width=w, joint="curve")


def _treble(d, x, y, a, ax, ay, s, t=0.0):
    """トレブルフック（3本針）。ax,ay が吊り下げ位置。下に垂れる"""
    sw = 4 * math.sin(t * 3)
    ring = _tf([(ax, ay)], x, y, a)[0]
    d.ellipse([ring[0] - 6, ring[1] - 6, ring[0] + 6, ring[1] + 6], outline=(70, 74, 80), width=3)
    # 吊り下げは常に画面の下向き（重力）
    bx, by = ring[0] + sw * 0.3, ring[1] + s * 0.75
    d.line([ring, (bx, by)], fill=(70, 74, 80), width=4)
    for sg in (-1, 1):
        pts = [(bx, by)]
        for k in range(0, 181, 20):
            th = math.radians(k)
            pts.append((bx + sg * s * 0.22 * math.sin(th), by - s * 0.22 + s * 0.22 * math.cos(th) * -1 + s * 0.22))
        pts.append((pts[-1][0] - sg * s * 0.06, pts[-1][1] - s * 0.1))
        d.line(pts, fill=(70, 74, 80), width=4, joint="curve")
    d.line([(bx, by), (bx, by + s * 0.18)], fill=(70, 74, 80), width=4)


def metal_jig(d, x, y, L, a=0.0, t=0.0, back=JIG_BACK, belly=JIG_BELLY, hooks=True, fat=1.0):
    """メタルジグ：細長い金属の体、ホロの模様、目、前のリングとアシストフック"""
    H = L * 0.11 * fat

    def prof(tt):
        base = math.sin(math.pi * min(1.0, 0.08 + tt * 0.95)) ** 0.55
        taper = 1 - 0.45 * tt
        return base * taper, base * taper * 0.95

    up, lo = _contour(L, H, prof)
    body = up + lo[::-1]
    d.polygon(_tf(body, x, y, a), fill=belly, outline=(30, 40, 60))
    backp = up + [(p[0], H * 0.05) for p in up[::-1]]
    d.polygon(_tf(backp, x, y, a), fill=back)
    # ホロのきらめき
    for k in range(7):
        tt = 0.18 + k * 0.1
        px = -L / 2 + L * tt
        hu, hl = prof(tt)
        col = HOLO[(k + int(t * 6)) % 3]
        d.line(_tf([(px, H * 0.15), (px + L * 0.04, H * hl * 0.8)], x, y, a), fill=col, width=3)
    # 側面のハイライト
    d.line(_tf([(-L * 0.38, -H * 0.1), (L * 0.3, -H * 0.05)], x, y, a), fill=(255, 255, 255), width=2)
    # 目
    ex, ey = _tf([(-L * 0.36, -H * 0.15)], x, y, a)[0]
    r = max(4, L * 0.035)
    d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(250, 220, 60), outline=INK)
    d.ellipse([ex - r * 0.45, ey - r * 0.45, ex + r * 0.45, ey + r * 0.45], fill=INK)
    # 前のリング
    rx, ry = _tf([(-L / 2 - L * 0.035, 0)], x, y, a)[0]
    rr = max(5, L * 0.03)
    d.ellipse([rx - rr, ry - rr, rx + rr, ry + rr], outline=(70, 74, 80), width=3)
    if hooks:
        # アシストラインと針（頭から背中側へ沿う）
        d.line(_tf([(-L / 2 - L * 0.035, 0), (-L * 0.3, -H * 1.5)], x, y, a), fill=(240, 200, 80), width=4)
        _jhook(d, x, y, a, -L * 0.3, -H * 1.5, L * 0.2, flip=-1, w=4)
        d.line(_tf([(-L / 2 - L * 0.035, 0), (-L * 0.32, H * 1.4)], x, y, a), fill=(240, 120, 80), width=4)
        _jhook(d, x, y, a, -L * 0.32, H * 1.4, L * 0.18, flip=1, w=4)


def blade_jig(d, x, y, L, a=0.0, t=0.0):
    """ブレードジグ：短い金属の体＋お腹の針＋お尻で回るブレード"""
    body_L = L * 0.62
    cx = -L * 0.19  # 体の中心（ローカル）
    bx, by = _tf([(cx, 0)], x, y, a)[0]
    metal_jig(d, bx, by, body_L, a, t, back=(60, 130, 90), belly=(236, 214, 120), hooks=False, fat=1.7)
    # お尻のリング・スイベル
    tail = cx + body_L / 2
    p1 = _tf([(tail + L * 0.04, 0)], x, y, a)[0]
    p2 = _tf([(tail + L * 0.11, 0)], x, y, a)[0]
    d.ellipse([p1[0] - 5, p1[1] - 5, p1[0] + 5, p1[1] + 5], outline=(70, 74, 80), width=3)
    d.ellipse([p2[0] - 6, p2[1] - 4, p2[0] + 6, p2[1] + 4], outline=(70, 74, 80), width=3)
    # ブレード（回転で幅が変わる木の葉形）
    ph = t * 16
    w = abs(math.cos(ph))
    bl = L * 0.3
    leaf = []
    for k in range(0, 361, 20):
        th = math.radians(k)
        leaf.append((tail + L * 0.14 + bl / 2 + bl / 2 * math.cos(th), L * 0.1 * (0.15 + 0.85 * w) * math.sin(th)))
    d.polygon(_tf(leaf, x, y, a), fill=GOLD if math.cos(ph) > 0 else (250, 230, 140), outline=GOLD_DARK)
    hl = _tf([(tail + L * 0.2, -L * 0.02 * w), (tail + L * 0.34, -L * 0.01 * w)], x, y, a)
    d.line(hl, fill=(255, 255, 230), width=3)
    # お腹の針（トレブル）
    _treble(d, x, y, a, cx - body_L * 0.15, L * 0.07, L * 0.22, t)
    # 前のアシスト
    _jhook(d, x, y, a, cx - body_L * 0.3, -L * 0.08, L * 0.13, flip=-1, w=3)


def minnow_plug(d, x, y, L, a=0.0, t=0.0, lip=True, back=(40, 120, 90)):
    """ミノー（プラグ）：魚の形の体、リップ、2つのトレブルフック"""
    H = L * 0.17

    def prof(tt):
        base = math.sin(math.pi * min(1.0, 0.06 + tt * 0.98)) ** 0.75
        taper = 1 - 0.25 * tt
        return base * taper, base * taper * 0.9

    up, lo = _contour(L * 0.9, H, prof)
    body = up + lo[::-1]
    off = -L * 0.03
    body = [(px + off, py) for px, py in body]
    if lip:
        lp = [(-L * 0.45, H * 0.35), (-L * 0.62, H * 1.15), (-L * 0.55, H * 1.35), (-L * 0.4, H * 0.75)]
        d.polygon(_tf(lp, x, y, a), fill=LIP, outline=(120, 160, 190))
        ex, ey = _tf([(-L * 0.6, H * 1.25)], x, y, a)[0]
        d.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], outline=(70, 74, 80), width=3)
    else:
        ex, ey = _tf([(-L * 0.5, 0)], x, y, a)[0]
        d.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], outline=(70, 74, 80), width=3)
    d.polygon(_tf(body, x, y, a), fill=(240, 244, 248), outline=(30, 40, 60))
    backp = [(p[0] + off, p[1]) for p in up] + [(p[0] + off, -H * 0.1) for p in up[::-1]]
    d.polygon(_tf(backp, x, y, a), fill=back)
    d.line(_tf([(-L * 0.3, H * 0.05), (L * 0.35, H * 0.05)], x, y, a), fill=(250, 200, 120), width=3)
    # 尾びれ
    d.polygon(_tf([(L * 0.42, 0), (L * 0.52, -H * 0.5), (L * 0.52, H * 0.5)], x, y, a), fill=back)
    # エラと目
    gx = -L * 0.27
    d.arc([_tf([(gx, 0)], x, y, a)[0][0] - H * 0.5, _tf([(gx, 0)], x, y, a)[0][1] - H * 0.7, _tf([(gx, 0)], x, y, a)[0][0] + H * 0.5, _tf([(gx, 0)], x, y, a)[0][1] + H * 0.7], -60, 60, fill=(200, 60, 60), width=3)
    ex, ey = _tf([(-L * 0.36, -H * 0.15)], x, y, a)[0]
    r = H * 0.32
    d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(250, 220, 60), outline=INK)
    d.ellipse([ex - r * 0.5, ey - r * 0.5, ex + r * 0.5, ey + r * 0.5], fill=INK)
    _treble(d, x, y, a, -L * 0.1, H * 0.85, L * 0.2, t)
    _treble(d, x, y, a, L * 0.3, H * 0.7, L * 0.2, t + 1)


SCENES = {
    "title": scene_title,
    "tackle": scene_tackle,
    "rig": lambda d, t, dur, s, m: (scene_rig_parts if "parts" in s else scene_rig)(d, t, dur, s, m),
    "place": scene_place,
    "action": lambda d, t, dur, s, m: (scene_action2 if s["kind"] in NEW_ACTIONS else scene_action)(d, t, dur, s, m),
    "knot": scene_knot,
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
    tag = (meta.get("tag") or "釣り方ガイド").split(" No.")[0]
    tw = d.textlength(tag, font=fb)
    d.rounded_rectangle([W - 70 - tw - 30, 80, W - 70, 136], radius=28, outline=WHITE, width=3)
    d.text((W - 70 - tw - 15, 86), tag, font=fb, fill=WHITE)
    ft = fit_font(d, meta["title"], FONT_BLACK, [46, 40, 34, 30], W - 120)
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
    # RGB の画像に RGBA で描くと半透明の色が正しく重なる（RGBA の画像だと上書きになる）
    layer = Image.new("RGB", (PW, PH), PANEL)
    ld = ImageDraw.Draw(layer, "RGBA")
    SCENES[s["type"]](ld, t, dur, s, meta)
    # 角を丸く切り抜く
    mask = Image.new("L", (PW, PH), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, PW, PH], radius=36, fill=255)
    a = ease(t / 0.35)
    if a < 1:
        mask = mask.point(lambda v: int(v * a))
    img.paste(layer, (PX, PY + int((1 - a) * 40)), mask)
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
    meta = {"title": tl["title"], "sub": tl.get("sub", ""), "no": tl.get("no"), "tag": tl.get("tag")}
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

    outdir = sys.argv[sys.argv.index("--outdir") + 1] if "--outdir" in sys.argv else "public/videos"
    os.makedirs(outdir, exist_ok=True)
    audio = f"{d}/narration.wav"
    has_audio = any(ln.get("wav") for s in tl["scenes"] for ln in s["lines"])
    if has_audio:
        mix_audio(timeline, total, audio)
    out = f"{outdir}/{slug}.mp4"
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
            frame.save(f"{outdir}/{slug}.jpg", quality=82)
    proc.stdin.close()
    proc.wait()
    print(f"wrote {out} ({os.path.getsize(out) / 1e6:.1f}MB)")


if __name__ == "__main__":
    main()
