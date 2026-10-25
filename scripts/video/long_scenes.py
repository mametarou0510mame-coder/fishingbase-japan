# 長尺動画の「全画面」シーン（つかみ・豆知識・データ・地図）。
# 海の中のような背景に、魚（assets/fish の画像）を泳がせ、グラフや地図を動きで見せる。
import json
import math
import random

from PIL import Image, ImageDraw, ImageFilter

import render as R
from render import F, FONT_BLACK, FONT_BOLD, FONT_REG, GLOW, NAVY, RED, WHITE, ease, wrap

W, H = 1920, 1080
TEAL = (95, 195, 201)
SUB = (190, 214, 232)
_bg = None
_fish = {}
_FISH_INDEX = None
_map = None


def fish_img(species, width, flip=False):
    """魚の画像（右向き）を指定の幅で。flip で左向き"""
    global _FISH_INDEX
    if _FISH_INDEX is None:
        try:
            _FISH_INDEX = json.load(open("assets/fish/index.json", encoding="utf-8"))
        except FileNotFoundError:
            _FISH_INDEX = {}
    key = (species, int(width), flip)
    if key not in _fish:
        f = _FISH_INDEX.get(species) or _FISH_INDEX.get("その他")
        if not f:
            return None
        im = Image.open(f"assets/fish/{f}").convert("RGBA")
        im = im.resize((int(width), int(im.height * width / im.width)), Image.LANCZOS)
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        _fish[key] = im
    return _fish[key]


def background(t):
    """海の中：上が明るい青、下が深い藍。光の筋がゆれ、泡がのぼる"""
    global _bg
    if _bg is None:
        _bg = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(_bg)
        for y in range(H):
            k = y / H
            d.line([(0, y), (W, y)], fill=(int(30 - 20 * k), int(118 - 76 * k), int(170 - 96 * k)))
    img = _bg.copy()
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for i in range(6):
        x = (i * 380 + 140 * math.sin(t * 0.25 + i)) % (W + 400) - 200
        d.polygon([(x, -10), (x + 120, -10), (x + 420, H), (x + 220, H)], fill=(255, 255, 255, 16))
    rnd = random.Random(7)
    for i in range(28):
        bx = rnd.uniform(0, W)
        sp = rnd.uniform(40, 110)
        r = rnd.uniform(3, 9)
        by = H - ((t * sp + rnd.uniform(0, H)) % (H + 40))
        bx += 12 * math.sin(t * 1.3 + i)
        d.ellipse([bx - r, by - r, bx + r, by + r], outline=(255, 255, 255, 90), width=2)
    img.paste(ov, (0, 0), ov)
    return img


def swim(img, species_list, t, depth_seed=3, count=None, scale=1.0):
    """魚を左右に泳がせる（尾の振りの代わりに、少しだけ上下にゆらす）"""
    rnd = random.Random(depth_seed)
    n = count or max(3, len(species_list) * 2)
    for i in range(n):
        sp = species_list[i % len(species_list)]
        w = rnd.uniform(220, 420) * scale
        speed = rnd.uniform(70, 160)
        y = rnd.uniform(120, H - 300)
        right = rnd.random() < 0.5
        span = W + w * 2
        x = (rnd.uniform(0, span) + t * speed) % span - w
        if not right:
            x = W - x
        im = fish_img(sp, w, flip=not right)
        if im is None:
            continue
        yy = y + 14 * math.sin(t * 2.2 + i)
        img.paste(im, (int(x - im.width / 2), int(yy - im.height / 2)), im)


def caption(img, text, t_in):
    if not text:
        return
    d = ImageDraw.Draw(img, "RGBA")
    f = F(FONT_BOLD, 50)
    ls = wrap(d, text, f, W - 360)
    lh = 70
    if len(ls) > 2:  # 長い文は少し小さくして3行まで
        f = F(FONT_BOLD, 44)
        ls = wrap(d, text, f, W - 340)[:3]
        lh = 62
    h = 40 + lh * len(ls)
    y = H - 60 - h
    d.rounded_rectangle([160, y, W - 160, y + h], radius=28, fill=(6, 22, 42, 215))
    for i, ln in enumerate(ls):
        tw = d.textlength(ln, font=f)
        d.text(((W - tw) / 2, y + 20 + i * lh), ln, font=f, fill=WHITE)


def header(img, meta, ci, progress):
    d = ImageDraw.Draw(img, "RGBA")
    R.logo(d, 40, 30, 52)
    chs = meta["chapters"]
    if ci < len(chs):
        f = F(FONT_BOLD, 32)
        tw = d.textlength(chs[ci]["title"], font=f)
        d.rounded_rectangle([W - 70 - tw, 36, W - 30, 86], radius=25, fill=(6, 22, 42, 180))
        d.text((W - 50 - tw, 40), chs[ci]["title"], font=f, fill=GLOW)
    d.rectangle([0, H - 8, W, H], fill=(20, 50, 80, 255))
    d.rectangle([0, H - 8, W * progress, H], fill=GLOW)


# ---------- シーン ----------
def scene_hook(img, t, dur, s, meta):
    swim(img, meta.get("sprites") or ["アジ"], t, depth_seed=11)
    d = ImageDraw.Draw(img, "RGBA")
    a = ease((t - 0.3) / 0.8)
    tag = meta.get("tag") or "釣り方ガイド 完全版"
    ft = F(FONT_BOLD, 38)
    tw = d.textlength(tag, font=ft)
    d.rounded_rectangle([(W - tw) / 2 - 28, 230, (W + tw) / 2 + 28, 290], radius=30, fill=(227, 65, 43, int(255 * a)))
    d.text(((W - tw) / 2, 236), tag, font=ft, fill=(255, 255, 255, int(255 * a)))
    title = meta["title"].replace("【完全版】", "")
    for size in (110, 96, 84, 72):
        fb = F(FONT_BLACK, size)
        ls = wrap(d, title, fb, W - 300)
        if len(ls) <= 2:
            break
    y = 330 + (1 - a) * 40
    for ln in ls:
        tw = d.textlength(ln, font=fb)
        d.text(((W - tw) / 2, y), ln, font=fb, fill=(255, 255, 255, int(255 * a)), stroke_width=6, stroke_fill=(6, 22, 42, int(220 * a)))
        y += size * 1.25


def scene_fact(img, t, dur, s, meta):
    d = ImageDraw.Draw(img, "RGBA")
    # 左：魚を大きく
    sp = s.get("sprite") or (meta.get("sprites") or ["アジ"])[0]
    a = ease(t / 0.7)
    im = fish_img(sp, 760)
    if im is not None:
        im2 = im.rotate(4 * math.sin(t * 1.4), resample=Image.BICUBIC, expand=True)
        x = int(80 + (1 - a) * -200)
        y = int(H / 2 - im2.height / 2 - 40 + 16 * math.sin(t * 1.8))
        img.paste(im2, (x, y), im2)
    # 右：カード
    cx = 960
    d.rounded_rectangle([cx, 170, W - 90, 820], radius=40, fill=(255, 255, 255, int(240 * a)))
    d.text((cx + 50, 205), f"知っておきたい {s.get('no', '')}", font=F(FONT_BOLD, 36), fill=(*RED, int(255 * a)))
    fh = F(FONT_BLACK, 64)
    y = 270
    for ln in wrap(d, s["title"], fh, W - 90 - cx - 100)[:2]:
        d.text((cx + 50, y), ln, font=fh, fill=(*NAVY, int(255 * a)))
        y += 84
    d.line([(cx + 50, y + 10), (cx + 250, y + 10)], fill=(*GLOW, int(255 * a)), width=8)
    fb = F(FONT_BOLD, 40)
    y += 50
    b = ease((t - 0.6) / 0.6)
    for ln in wrap(d, s["text"], fb, W - 90 - cx - 100)[:6]:
        d.text((cx + 50, y), ln, font=fb, fill=(30, 50, 72, int(255 * b)))
        y += 60


def chart_panel(img, title, note):
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([140, 110, W - 140, 770], radius=40, fill=(255, 255, 255, 245))
    d.text((200, 140), title, font=F(FONT_BLACK, 56), fill=NAVY)
    d.text((200, 728), note, font=F(FONT_REG, 26), fill=(110, 125, 140))
    return d


def scene_season(img, t, dur, s, meta):
    labels, rates = s["labels"], s["rates"]
    if len(labels) == 1:
        d = chart_panel(img, f"{labels[0]}が釣れる時期", s["note"])
        r = rates[0]
        mx = max(r) or 1
        best = [m for m in range(12) if r[m] >= mx * 0.55]
        x0, y0, bw, gap, hmax = 230, 660, 100, 22, 400
        for m in range(12):
            k = ease((t - 0.4 - m * 0.08) / 0.6)
            h = hmax * r[m] / mx * k
            col = GLOW if m in best else TEAL
            x = x0 + m * (bw + gap)
            d.rounded_rectangle([x, y0 - h, x + bw, y0], radius=14, fill=col)
            d.text((x + bw / 2, y0 + 8), f"{m + 1}月", font=F(FONT_BOLD, 30), fill=NAVY, anchor="ma")
            if k > 0.95 and r[m] == mx:
                d.text((x + bw / 2, y0 - h - 54), "いちばん", font=F(FONT_BLACK, 32), fill=RED, anchor="ma")
    else:
        d = chart_panel(img, "魚ごとの釣れる時期カレンダー", s["note"])
        x0, y0, cw, ch = 470, 260, 100, min(60, 440 // len(labels))
        for m in range(12):
            d.text((x0 + m * cw + cw / 2, y0 - 46), f"{m + 1}月", font=F(FONT_BOLD, 28), fill=NAVY, anchor="ma")
        for i, (lab, r) in enumerate(zip(labels, rates)):
            k = ease((t - 0.4 - i * 0.25) / 0.6)
            y = y0 + i * (ch + 8)
            d.text((x0 - 20, y + ch / 2), lab, font=F(FONT_BOLD, 34), fill=NAVY, anchor="rm")
            mx = max(r) or 1
            for m in range(12):
                v = (r[m] / mx) * k
                col = (int(232 - 220 * v * 0.2 - 10), int(244 - 130 * v), int(250 - 200 * v))
                if r[m] >= mx * 0.55 and k > 0.9:
                    col = (242, 182, 48)
                d.rounded_rectangle([x0 + m * cw + 4, y, x0 + (m + 1) * cw - 4, y + ch], radius=10, fill=col)


def scene_tide(img, t, dur, s, meta):
    d = chart_panel(img, f"潮の大きさと{s['label']}の釣れやすさ", "平均を1.0とした倍率（同じ公開釣果の集計より）")
    keys = ["大", "中", "小"]
    vals = [s["lifts"][k] for k in keys]
    mx = max(vals)
    for i, k in enumerate(keys):
        e = ease((t - 0.4 - i * 0.2) / 0.6)
        x = 420 + i * 400
        h = 360 * (vals[i] / (mx * 1.1)) * e
        col = GLOW if vals[i] == mx else TEAL
        d.rounded_rectangle([x, 660 - h, x + 220, 660], radius=18, fill=col)
        d.text((x + 110, 668), f"{k}潮", font=F(FONT_BLACK, 40), fill=NAVY, anchor="ma")
        if e > 0.9:
            d.text((x + 110, 660 - h - 60), f"{vals[i]:.2f}倍", font=F(FONT_BLACK, 40), fill=RED if vals[i] == mx else NAVY, anchor="ma")
    d.line([(380, 660 - 360 / 1.1 / mx), (1600, 660 - 360 / 1.1 / mx)], fill=(200, 80, 60), width=3)
    d.text((1610, 660 - 360 / 1.1 / mx), "平均", font=F(FONT_BOLD, 26), fill=(200, 80, 60), anchor="lm")


def _load_map():
    global _map
    if _map is None:
        _map = json.load(open("lib/kansaiMap.json", encoding="utf-8"))
    return _map


def scene_map(img, t, dur, s, meta):
    m = _load_map()
    pins = s["spots"]
    def inside(p, v):
        return v["bbox"][0] <= p["lon"] <= v["bbox"][2] and v["bbox"][1] <= p["lat"] <= v["bbox"][3]

    view = next((m[k] for k in ("bay", "wide", "kansai") if k in m and all(inside(p, m[k]) for p in pins[:5])), m["kansai"])

    def inbay(p):
        return inside(p, view)
    box_h = 680
    k = box_h / view["h"]
    bw = view["w"] * k
    ox, oy = 120, 100
    sea = Image.new("RGB", (int(bw), box_h), (198, 226, 246))
    ds = ImageDraw.Draw(sea)
    for sub in view["path"].split("Z"):
        if not sub:
            continue
        pts = [tuple(float(v) * k for v in pt.split()) for pt in sub[1:].split("L")]
        if len(pts) > 2:
            ds.polygon(pts, fill=(238, 232, 218), outline=(150, 160, 170))
    mask = Image.new("L", sea.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sea.width, sea.height], radius=36, fill=255)
    img.paste(sea, (ox, oy), mask)
    d = ImageDraw.Draw(img, "RGBA")
    # 目印の地名
    for name, la, lo in [("神戸", 34.69, 135.19), ("大阪", 34.68, 135.47), ("堺", 34.57, 135.46), ("淡路島", 34.45, 134.98), ("和歌山", 34.23, 135.17), ("明石", 34.65, 134.99), ("岸和田", 34.46, 135.40), ("京都府北部", 35.55, 135.25), ("南紀", 33.70, 135.40)]:
        if not (view["bbox"][0] <= lo <= view["bbox"][2] and view["bbox"][1] <= la <= view["bbox"][3]):
            continue
        x = ox + (lo - view["lon0"]) * view["c"] * view["k"] * k
        y = oy + (view["lat1"] - la) * view["k"] * k
        d.text((x, y), name, font=F(FONT_BOLD, 26), fill=(90, 100, 110), anchor="mm")
    mxn = max((p.get("n") or 1) for p in pins)
    for i, p in enumerate(pins):
        if not inbay(p):
            continue
        e = ease((t - 0.8 - i * 0.35) / 0.4)
        if e <= 0:
            continue
        x = ox + (p["lon"] - view["lon0"]) * view["c"] * view["k"] * k
        y = oy + (view["lat1"] - p["lat"]) * view["k"] * k
        r = (14 + 22 * (p.get("n") or 1) / mxn) * e
        d.ellipse([x - r - 8, y - r - 8, x + r + 8, y + r + 8], fill=(227, 65, 43, 70))
        d.ellipse([x - r, y - r, x + r, y + r], fill=RED, outline=WHITE, width=4)
        d.text((x, y), str(i + 1), font=F(FONT_BLACK, int(max(18, r))), fill=WHITE, anchor="mm")
    # 右の一覧
    lx = ox + bw + 60
    d.text((lx, 110), s.get("title1") or f"最近、{s['label']}が", font=F(FONT_BLACK, 50), fill=WHITE)
    d.text((lx, 175), s.get("title2") or "釣れている釣り場", font=F(FONT_BLACK, 50), fill=GLOW)
    for i, p in enumerate(pins[:7]):
        e = ease((t - 0.8 - i * 0.35) / 0.4)
        if e <= 0:
            continue
        y = 270 + i * 82
        d.rounded_rectangle([lx, y, W - 80, y + 68], radius=34, fill=(6, 22, 42, int(200 * e)))
        d.ellipse([lx + 10, y + 9, lx + 60, y + 59], fill=RED)
        d.text((lx + 35, y + 34), str(i + 1), font=F(FONT_BLACK, 30), fill=WHITE, anchor="mm")
        name = p["name"] if len(p["name"]) <= 14 else p["name"][:13] + "…"
        d.text((lx + 80, y + 12), name, font=F(FONT_BOLD, 36), fill=WHITE)
        if p.get("n") is not None and not s.get("hide_n"):
            d.text((W - 100, y + 14), p.get("ntext") or f"{p['n']}件", font=F(FONT_BOLD, 34), fill=GLOW, anchor="ra")
    d.text((lx, 270 + min(7, len(pins)) * 82 + 6), s.get("note", "直近45日の、施設などの公開釣果の件数"), font=F(FONT_REG, 26), fill=SUB)


FULL = {"hook": scene_hook, "fact": scene_fact, "season": scene_season, "tide": scene_tide, "map": scene_map}
NO_BG_CAPTION = {"map"}  # 地図は字幕を下に出す


# ---------- v4：釣り方の章（全画面） ----------
import re as _re

DARK = (6, 22, 42)
GOLD = (242, 182, 48)
CARD = (255, 255, 255)


def _a(c, a):
    return (*c[:3], int(255 * max(0, min(1, a))))


def _cur(s, t, off=0):
    """いま読み上げている行（sync した行の番号。始まる前は -1）"""
    ap = s.get("appear") or []
    k = -1
    for i, x in enumerate(ap):
        if t >= x - 0.1:
            k = i
    return k


def heading_full(d, text, a=1.0, x=160, y=118, size=60):
    f = F(FONT_BLACK, size)
    d.rounded_rectangle([x - 26, y + 8, x - 14, y + size + 4], radius=6, fill=_a(GOLD, a))
    d.text((x, y), text, font=f, fill=_a(WHITE, a), stroke_width=3, stroke_fill=_a(DARK, a * 0.8))


def _fitwrap(d, text, path, sizes, maxw, max_lines):
    for sz in sizes:
        f = F(path, sz)
        ls = wrap(d, text, f, maxw, tokens=max_lines <= 4)
        if len(ls) <= max_lines:
            return f, ls
    return f, ls[:max_lines]


def scene_chapter_full(img, t, dur, s, meta):
    swim(img, s.get("sprites") or meta.get("sprites") or ["アジ"], t, depth_seed=20 + s.get("no", 1), count=4, scale=0.8)
    d = ImageDraw.Draw(img, "RGBA")
    a = ease(t / 0.6)
    lab = f"CHAPTER {s.get('no', '')}"
    f1 = F(FONT_BLACK, 40)
    tw = d.textlength(lab, font=f1)
    d.rounded_rectangle([(W - tw) / 2 - 30, 200, (W + tw) / 2 + 30, 262], radius=31, fill=_a(RED, a))
    d.text(((W - tw) / 2, 207), lab, font=f1, fill=_a(WHITE, a))
    ft, ls = _fitwrap(d, s["title"], FONT_BLACK, [120, 104, 92, 80], W - 300, 2)
    y = 300 + (1 - a) * 30
    for ln in ls:
        w2 = d.textlength(ln, font=ft)
        d.text(((W - w2) / 2, y), ln, font=ft, fill=_a(WHITE, a), stroke_width=7, stroke_fill=_a(DARK, a * 0.9))
        y += ft.size * 1.2
    b = ease((t - 0.5) / 0.6)
    d.line([(W / 2 - 160 * b, y + 16), (W / 2 + 160 * b, y + 16)], fill=_a(GOLD, a), width=8)
    fi = F(FONT_BOLD, 36)
    items = [x.replace("ポイント：", "") for x in s.get("items", [])][:3]
    if items:
        pills = []
        for it in items:
            it = it if len(it) <= 16 else it[:15] + "…"
            pills.append((it, d.textlength(it, font=fi) + 64))
        total = sum(w for _, w in pills) + 24 * (len(pills) - 1)
        x = (W - total) / 2
        for i, (it, w) in enumerate(pills):
            c = ease((t - 0.8 - i * 0.3) / 0.4)
            d.rounded_rectangle([x, y + 60, x + w, y + 124], radius=32, fill=_a(DARK, c * 0.85), outline=_a(TEAL, c), width=3)
            d.text((x + 32, y + 70), it, font=fi, fill=_a(WHITE, c))
            x += w + 24


PANEL_SC = 0.84
PNL_W, PNL_H = int(980 * PANEL_SC), int(1020 * PANEL_SC)
PNL_X, PNL_Y = 70, 128


def _panel(img, layer, a=1.0):
    layer = layer.resize((PNL_W, PNL_H), Image.BILINEAR)
    mask = Image.new("L", (PNL_W, PNL_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, PNL_W, PNL_H], radius=34, fill=int(255 * a))
    sh = Image.new("RGBA", (PNL_W + 40, PNL_H + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([20, 26, PNL_W + 20, PNL_H + 26], radius=34, fill=(0, 0, 0, int(90 * a)))
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    img.paste(sh, (PNL_X - 20, PNL_Y - 20), sh)
    img.paste(layer, (PNL_X, PNL_Y), mask)


def _stepper(d, s, x0, y0, w, h, a=1.0):
    """手順の一覧（いまの手順を大きく）"""
    allt = s["all"]
    k = s["no"] - 1
    n = len(allt)
    rh = min(150, h / n)
    for i, ti in enumerate(allt):
        y = y0 + i * rh
        on, done = i == k, i < k
        fill = (255, 244, 214) if on else ((232, 238, 244) if done else CARD)
        d.rounded_rectangle([x0, y + 8, x0 + w, y + rh - 8], radius=22, fill=_a(fill, a), outline=_a(GOLD if on else (205, 216, 228), a), width=6 if on else 2)
        cy = y + rh / 2
        d.ellipse([x0 + 22, cy - 30, x0 + 82, cy + 30], fill=_a(RED if on else (NAVY if not done else (150, 160, 172)), a))
        d.text((x0 + 52, cy), str(i + 1), font=F(FONT_BLACK, 34), fill=_a(WHITE, a), anchor="mm")
        f2, ls = _fitwrap(d, ti, FONT_BLACK if on else FONT_BOLD, [42, 38, 34, 30], w - 130, 2)
        ty = cy - len(ls) * (f2.size + 6) / 2
        for j, ln in enumerate(ls):
            d.text((x0 + 104, ty + j * (f2.size + 6)), ln, font=f2, fill=_a(NAVY if not done else (120, 130, 140), a))
        if done:
            d.text((x0 + w - 30, cy), "✓", font=F(FONT_BLACK, 40), fill=_a((60, 160, 110), a), anchor="rm")


def scene_step(img, t, dur, s, meta):
    a = ease(t / 0.4)
    dg = s.get("diagram")
    if not dg:  # 図がない手順は、奥を魚が泳ぐ
        swim(img, meta.get("sprites") or ["アジ"], t, depth_seed=40 + s["no"], count=2, scale=0.55)
    if dg:
        layer = Image.new("RGB", (R.PW, R.PH), R.PANEL)
        ld = ImageDraw.Draw(layer, "RGBA")
        dg = dict(dg, lines=[], heading=_re.sub(r"^[①-⑳]\s*", "", dg.get("heading", "")) or s["title"])
        R.SCENES[dg["type"]](ld, t, dur, dg, meta)
        _panel(img, layer, a)
    else:
        layer = Image.new("RGB", (R.PW, R.PH), R.PANEL)
        ld = ImageDraw.Draw(layer, "RGBA")
        R.heading(ld, "手順")
        _stepper(ld, s, 30, 150, R.PW - 60, R.PH - 180)
        _panel(img, layer, a)
    d = ImageDraw.Draw(img, "RGBA")
    rx = PNL_X + PNL_W + 60
    rw = W - 70 - rx
    # STEP バッジと進み具合
    fb = F(FONT_BLACK, 40)
    lab = f"STEP {s['no']}"
    tw = d.textlength(lab, font=fb)
    d.rounded_rectangle([rx, 130, rx + tw + 50, 192], radius=31, fill=_a(RED, a))
    d.text((rx + 25, 137), lab, font=fb, fill=_a(WHITE, a))
    n = s["total"]
    for i in range(n):
        cx = rx + tw + 90 + i * 44
        col = GOLD if i == s["no"] - 1 else (WHITE if i < s["no"] - 1 else (70, 100, 130))
        d.ellipse([cx - 12, 149, cx + 12, 173], fill=_a(col, a))
    d.text((rx + tw + 90 + n * 44, 161), f"/ {n}", font=F(FONT_BOLD, 30), fill=_a(SUB, a), anchor="lm")
    ft, ls = _fitwrap(d, s["title"], FONT_BLACK, [70, 62, 56, 50], rw, 2)
    y = 222
    for ln in ls:
        d.text((rx, y), ln, font=ft, fill=_a(WHITE, a), stroke_width=4, stroke_fill=_a(DARK, a * 0.8))
        y += ft.size * 1.2
    # ナレーション（字幕）を右の箱に
    cap = s.get("_cap")
    if cap:
        cap = _re.sub(r"^ステップ\d+、[^。]*。", "", cap) or cap
        f, ls2 = _fitwrap(d, cap, FONT_BOLD, [44, 40, 36], rw - 70, 8)
        top = max(y + 30, 420)
        bh = 50 + len(ls2) * (f.size + 18)
        d.rounded_rectangle([rx, top, rx + rw, top + bh], radius=28, fill=(255, 255, 255, 235))
        d.rectangle([rx, top + 24, rx + 10, top + bh - 24], fill=GOLD)
        for j, ln in enumerate(ls2):
            d.text((rx + 40, top + 25 + j * (f.size + 18)), ln, font=f, fill=NAVY)


def scene_pattern2(img, t, dur, s, meta):
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", "状況別のコツ"), ease(t / 0.4))
    rows = s["rows"]
    k = _cur(s, t)
    n = len(rows)
    rh = min(150, 600 / max(n, 1))
    for i, (wh, do) in enumerate(rows):
        ap = (s.get("appear") or [0.3 + i * 0.6] * n)[i] if i < len(s.get("appear") or []) else 0.3 + i * 0.6
        a = ease((t - ap + 0.1) / 0.4)
        if a <= 0:
            continue
        y = 210 + i * rh
        on = i == k
        x = 160 + (1 - a) * 60
        d.rounded_rectangle([x, y, x + 640, y + rh - 18], radius=24, fill=_a((14, 44, 78), a), outline=_a(GOLD if on else TEAL, a), width=5 if on else 2)
        d.text((x + 28, y + 12), "こんな時", font=F(FONT_BOLD, 24), fill=_a(TEAL, a))
        f1, l1 = _fitwrap(d, wh, FONT_BOLD, [38, 34, 30], 580, 2)
        for j, ln in enumerate(l1):
            d.text((x + 28, y + 44 + j * (f1.size + 6)), ln, font=f1, fill=_a(WHITE, a))
        ax = x + 664
        cy = y + (rh - 18) / 2
        d.polygon([(ax, cy - 26), (ax + 40, cy), (ax, cy + 26)], fill=_a(GOLD if on else WHITE, a))
        bx = ax + 64
        d.rounded_rectangle([bx, y, W - 160, y + rh - 18], radius=24, fill=_a((255, 248, 226) if on else CARD, a), outline=_a(GOLD, a) if on else None, width=5)
        d.text((bx + 28, y + 12), "こうする", font=F(FONT_BOLD, 24), fill=_a(RED, a))
        f2, l2 = _fitwrap(d, do, FONT_BLACK, [38, 34, 30], W - 160 - bx - 56, 2)
        for j, ln in enumerate(l2):
            d.text((bx + 28, y + 44 + j * (f2.size + 6)), ln, font=f2, fill=_a(NAVY, a))


def scene_tackle2(img, t, dur, s, meta):
    d = ImageDraw.Draw(img, "RGBA")
    a0 = ease(t / 0.4)
    heading_full(d, s.get("heading", "まずそろえる道具"), a0)
    if s.get("budget"):
        txt = "予算 " + s["budget"].replace("目安 ", "")
        fb = F(FONT_BLACK, 38)
        tw = d.textlength(txt, font=fb)
        d.rounded_rectangle([W - 160 - tw - 50, 120, W - 160, 180], radius=30, fill=_a(GOLD, a0))
        d.text((W - 160 - tw - 25, 127), txt, font=fb, fill=_a(DARK, a0))
    items = s["items"][:6]
    cols = 3
    cw, ch, gap = (W - 320 - 2 * 30) / 3, 230, 30
    step = max(0.45, (dur - 2.5) / max(len(items), 1))
    for i, (name, spec) in enumerate(items):
        a = ease((t - 0.6 - i * step) / 0.4)
        if a <= 0:
            continue
        x = 160 + (i % cols) * (cw + gap)
        y = 215 + (i // cols) * (ch + 26) + (1 - a) * 30
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=26, fill=_a(CARD, a))
        d.ellipse([x + 24, y + 24, x + 80, y + 80], fill=_a(RED, a))
        d.text((x + 52, y + 52), str(i + 1), font=F(FONT_BLACK, 32), fill=_a(WHITE, a), anchor="mm")
        d.text((x + 100, y + 26), name, font=F(FONT_BLACK, 46), fill=_a(NAVY, a))
        f, ls = _fitwrap(d, spec, FONT_BOLD, [32, 29, 26], cw - 56, 4)
        for j, ln in enumerate(ls):
            d.text((x + 28, y + 104 + j * (f.size + 10)), ln, font=f, fill=_a((40, 60, 84), a))
    d.text((W - 160, 770), "【PR】それぞれの道具は、概要欄の楽天市場リンクから探せます", font=F(FONT_BOLD, 28), fill=_a(SUB, a0), anchor="ra")


def scene_cards(img, t, dur, s, meta):
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    items = s.get("items", [])[:6]
    two = len(items) > 4
    cols = 2 if two else 1
    cw = (W - 320 - 30) / 2 if two else W - 320
    rows = math.ceil(len(items) / cols)
    rh = min(140, 560 / max(rows, 1))
    step = max(0.3, min(0.9, (dur - 2) / max(len(items), 1)))
    for i, it in enumerate(items):
        a = ease((t - 0.5 - i * step) / 0.4)
        if a <= 0:
            continue
        x = 160 + (i % cols) * (cw + 30)
        y = 215 + (i // cols) * (rh + 16)
        d.rounded_rectangle([x, y, x + cw, y + rh], radius=24, fill=_a(CARD, a * 0.96))
        if s.get("numbered"):
            d.ellipse([x + 22, y + rh / 2 - 30, x + 82, y + rh / 2 + 30], fill=_a(RED, a))
            d.text((x + 52, y + rh / 2), str(i + 1), font=F(FONT_BLACK, 32), fill=_a(WHITE, a), anchor="mm")
        else:
            d.rounded_rectangle([x + 30, y + 22, x + 42, y + rh - 22], radius=6, fill=_a(GOLD, a))
        f, ls = _fitwrap(d, it, FONT_BOLD, [42, 38, 34, 30], cw - 140, 2)
        ty = y + rh / 2 - len(ls) * (f.size + 8) / 2
        for j, ln in enumerate(ls):
            d.text((x + 104 if s.get("numbered") else x + 70, ty + j * (f.size + 8)), ln, font=f, fill=_a(NAVY, a))


def scene_quiz(img, t, dur, s, meta):
    swim(img, meta.get("sprites") or ["アジ"], t, depth_seed=31, count=3, scale=0.6)
    d = ImageDraw.Draw(img, "RGBA")
    a = ease(t / 0.5)
    f1 = F(FONT_BLACK, 44)
    d.rounded_rectangle([160, 120, 340, 186], radius=33, fill=_a(RED, a))
    d.text((250, 153), "QUIZ", font=f1, fill=_a(WHITE, a), anchor="mm")
    fq, lq = _fitwrap(d, s["q"], FONT_BLACK, [64, 58, 52], W - 320, 2)
    for j, ln in enumerate(lq):
        d.text((160, 215 + j * (fq.size + 16)), ln, font=fq, fill=_a(WHITE, a), stroke_width=4, stroke_fill=_a(DARK, a * 0.8))
    cues = s.get("_cues") or []
    reveal = cues[-1] if len(cues) >= 2 else dur * 0.6
    r = ease((t - reveal) / 0.4)
    opts = s["options"]
    n = len(opts)
    gap = 40
    ow = (W - 320 - gap * (n - 1)) / n
    for i, o in enumerate(opts):
        b = ease((t - 0.8 - i * 0.5) / 0.4)
        if b <= 0:
            continue
        x = 160 + i * (ow + gap)
        y = 430
        ok = i == s["answer"]
        dim = 1 - 0.55 * r if not ok else 1
        fill = tuple(int(CARD[c] * (1 - r) + GOLD[c] * r) for c in range(3)) if ok else CARD
        d.rounded_rectangle([x, y, x + ow, y + 230], radius=30, fill=_a(fill, b * dim), outline=_a(RED, r) if ok else None, width=8)
        d.ellipse([x + 26, y + 26, x + 96, y + 96], fill=_a(NAVY, b * dim))
        d.text((x + 61, y + 61), str(i + 1), font=F(FONT_BLACK, 40), fill=_a(WHITE, b * dim), anchor="mm")
        fo, lo = _fitwrap(d, o, FONT_BLACK, [64, 56, 48, 40], ow - 60, 2)
        for j, ln in enumerate(lo):
            d.text((x + ow / 2, y + 130 + (j - (len(lo) - 1) / 2) * (fo.size + 8)), ln, font=fo, fill=_a(NAVY, b * dim), anchor="mm")
        if ok and r > 0:
            d.rounded_rectangle([x + ow - 170, y - 30, x + ow + 10, y + 34], radius=32, fill=_a(RED, r))
            d.text((x + ow - 80, y + 2), "正解！", font=F(FONT_BLACK, 40), fill=_a(WHITE, r), anchor="mm")
    # 考える時間の目印
    if len(cues) >= 2 and cues[0] < t < reveal:
        k = (t - cues[0]) / max(0.1, reveal - cues[0])
        d.arc([W - 260, 110, W - 160, 210], -90, -90 + 360 * (1 - k), fill=GOLD, width=10)
        d.text((W - 210, 160), "?", font=F(FONT_BLACK, 50), fill=WHITE, anchor="mm")


def scene_ask_full(img, t, dur, s, meta):
    swim(img, meta.get("sprites") or ["アジ"], t, depth_seed=51, count=3, scale=0.6)
    d = ImageDraw.Draw(img, "RGBA")
    a = ease(t / 0.5)
    lab = s.get("heading", "コメントで教えて！")
    fl = F(FONT_BLACK, 42)
    tw = d.textlength(lab, font=fl)
    d.rounded_rectangle([(W - tw) / 2 - 34, 130, (W + tw) / 2 + 34, 200], radius=35, fill=_a(RED, a))
    d.text(((W - tw) / 2, 140), lab, font=fl, fill=_a(WHITE, a))
    fq, lq = _fitwrap(d, s["question"], FONT_BLACK, [80, 70, 62], W - 340, 2)
    y = 240
    for ln in lq:
        w2 = d.textlength(ln, font=fq)
        d.text(((W - w2) / 2, y), ln, font=fq, fill=_a(WHITE, a), stroke_width=6, stroke_fill=_a(DARK, a * 0.9))
        y += fq.size * 1.25
    opts = s.get("options", [])
    n = max(1, len(opts))
    gap = 40
    ow = min(480, (W - 320 - gap * (n - 1)) / n)
    x0 = (W - (ow * n + gap * (n - 1))) / 2
    for i, o in enumerate(opts):
        b = ease((t - 0.6 - i * 0.35) / 0.4)
        if b <= 0:
            continue
        x = x0 + i * (ow + gap)
        yy = y + 50 + (1 - b) * 30
        d.rounded_rectangle([x, yy, x + ow, yy + 150], radius=34, fill=_a(CARD, b))
        d.ellipse([x + 26, yy + 41, x + 94, yy + 109], fill=_a(RED, b))
        d.text((x + 60, yy + 75), str(i + 1), font=F(FONT_BLACK, 40), fill=_a(WHITE, b), anchor="mm")
        fo, lo = _fitwrap(d, o, FONT_BLACK, [54, 46, 40, 34], ow - 140, 2)
        for j, ln in enumerate(lo):
            d.text((x + 116, yy + 75 + (j - (len(lo) - 1) / 2) * (fo.size + 6)), ln, font=fo, fill=_a(NAVY, b), anchor="lm")
    c = ease((t - 0.8 - n * 0.35) / 0.5)
    if c > 0:
        txt = "💬 番号＋ひとことでコメントしてね"
        txt = txt[2:]
        fc = F(FONT_BOLD, 44)
        w2 = d.textlength(txt, font=fc)
        d.text(((W - w2) / 2, y + 240), txt, font=fc, fill=_a(GOLD, c))


def scene_end_full(img, t, dur, s, meta):
    swim(img, meta.get("sprites") or ["アジ"], t, depth_seed=61, count=5, scale=0.7)
    d = ImageDraw.Draw(img, "RGBA")
    a = ease(t / 0.6)
    R.logo(d, W / 2 - 330, 170, 150)
    f = F(FONT_BLACK, 60)
    for j, ln in enumerate(["釣れる時間・釣り場・釣果を", "まとめてチェック"]):
        w2 = d.textlength(ln, font=f)
        d.text(((W - w2) / 2, 400 + j * 84), ln, font=f, fill=_a(WHITE, a), stroke_width=4, stroke_fill=_a(DARK, a * 0.8))
    b = ease((t - 0.5) / 0.5)
    txt = "「ツレドキ関西」で検索"
    fb = F(FONT_BLACK, 60)
    tw = d.textlength(txt, font=fb)
    d.rounded_rectangle([(W - tw) / 2 - 44, 600, (W + tw) / 2 + 44, 704], radius=52, fill=_a(GLOW, b))
    d.text(((W - tw) / 2, 614), txt, font=fb, fill=_a(DARK, b))
    fs = F(FONT_REG, 30)
    u = "tsuredoki-kansai.mametarou0510mame.workers.dev"
    d.text(((W - d.textlength(u, font=fs)) / 2, 724), u, font=fs, fill=_a(SUB, b))


FULL.update({"ask": scene_ask_full, "end": scene_end_full, "chapter": scene_chapter_full, "step": scene_step, "pattern2": scene_pattern2, "tackle2": scene_tackle2, "cards": scene_cards, "quiz": scene_quiz})
OWN_CAPTION = {"step"}


# ---------- v5：データで見せる全画面シーン（釣り場カード・ランキング・比較表・風の図・数字・出世魚・見分け方） ----------
def _view_for(points):
    m = _load_map()
    def inside(p, v):
        return v["bbox"][0] <= p["lon"] <= v["bbox"][2] and v["bbox"][1] <= p["lat"] <= v["bbox"][3]
    for k in ("bay", "wide", "kansai"):
        if k in m and all(inside(p, m[k]) for p in points):
            return m[k]
    return m["kansai"]


def basemap(img, view, ox, oy, box_h, radius=36):
    """海岸線の地図を描き、緯度経度→画面の位置に変える関数を返す"""
    k = box_h / view["h"]
    bw = view["w"] * k
    sea = Image.new("RGB", (int(bw), box_h), (198, 226, 246))
    ds = ImageDraw.Draw(sea)
    for sub in view["path"].split("Z"):
        if not sub:
            continue
        pts = [tuple(float(v) * k for v in pt.split()) for pt in sub[1:].split("L")]
        if len(pts) > 2:
            ds.polygon(pts, fill=(238, 232, 218), outline=(150, 160, 170))
    mask = Image.new("L", sea.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sea.width, sea.height], radius=radius, fill=255)
    img.paste(sea, (ox, oy), mask)

    def xy(lat, lon):
        return ox + (lon - view["lon0"]) * view["c"] * view["k"] * k, oy + (view["lat1"] - lat) * view["k"] * k
    return xy, bw


CITY = [("神戸", 34.69, 135.19), ("大阪", 34.68, 135.47), ("堺", 34.57, 135.46), ("淡路島", 34.45, 134.98), ("和歌山", 34.23, 135.17), ("明石", 34.65, 134.99),
        ("岸和田", 34.46, 135.40), ("舞鶴", 35.47, 135.33), ("白浜", 33.68, 135.35), ("高砂", 34.75, 134.79), ("芦屋", 34.73, 135.30)]


def scene_spotcard(img, t, dur, s, meta):
    a = ease(t / 0.5)
    pins = s.get("pins") or [s["pin"]]
    view = _view_for(pins)
    box_h = 740
    xy, bw = basemap(img, view, 70, 150, box_h)
    d = ImageDraw.Draw(img, "RGBA")
    for name, la, lo in CITY:
        if view["bbox"][0] <= lo <= view["bbox"][2] and view["bbox"][1] <= la <= view["bbox"][3]:
            x, y = xy(la, lo)
            d.text((x, y), name, font=F(FONT_BOLD, 24), fill=(90, 100, 110), anchor="mm")
    for p in pins:
        x, y = xy(p["lat"], p["lon"])
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(120, 140, 160, 200), outline=WHITE, width=2)
    x, y = xy(s["pin"]["lat"], s["pin"]["lon"])
    pul = 1 + 0.25 * math.sin(t * 4)
    r = 22 * a
    d.ellipse([x - r * 1.9 * pul, y - r * 1.9 * pul, x + r * 1.9 * pul, y + r * 1.9 * pul], fill=(227, 65, 43, 60))
    d.ellipse([x - r, y - r, x + r, y + r], fill=RED, outline=WHITE, width=5)
    if s.get("no"):
        d.text((x, y), str(s["no"]), font=F(FONT_BLACK, 24), fill=WHITE, anchor="mm")
    # 右のカード
    cx, cw = int(70 + bw + 40), int(W - 70 - (70 + bw + 40))
    d.rounded_rectangle([cx, 150, cx + cw, 150 + box_h], radius=32, fill=_a(CARD, a))
    y0 = 180
    if s.get("typeLabel"):
        ft = F(FONT_BOLD, 28)
        tw = d.textlength(s["typeLabel"], font=ft)
        d.rounded_rectangle([cx + 36, y0, cx + 36 + tw + 36, y0 + 46], radius=23, fill=_a(TEAL, a))
        d.text((cx + 54, y0 + 6), s["typeLabel"], font=ft, fill=_a(WHITE, a))
        if s.get("no") and s.get("total"):
            d.text((cx + cw - 36, y0 + 6), f"{s['no']} / {s['total']}", font=F(FONT_BOLD, 30), fill=_a((120, 135, 150), a), anchor="ra")
        y0 += 62
    fn, ln = _fitwrap(d, s["name"], FONT_BLACK, [56, 50, 44, 38], cw - 72, 2)
    for l in ln:
        d.text((cx + 36, y0), l, font=fn, fill=_a(NAVY, a))
        y0 += fn.size + 10
    if s.get("area"):
        d.text((cx + 36, y0), s["area"], font=F(FONT_BOLD, 28), fill=_a((110, 125, 140), a))
        y0 += 46
    d.line([(cx + 36, y0), (cx + cw - 36, y0)], fill=_a((220, 228, 236), a), width=2)
    y0 += 18
    rows = [(k, v) for k, v in s.get("rows", []) if v][:5]
    few = len(rows) <= 3
    for i, (k, v) in enumerate(rows):
        b = ease((t - 0.4 - i * 0.25) / 0.4)
        d.text((cx + 36, y0 + (4 if few else 0)), k, font=F(FONT_BOLD, 30 if few else 26), fill=_a(RED, b))
        f2, l2 = _fitwrap(d, v, FONT_BOLD, [36, 32, 28] if few else [30, 28, 26], cw - 210, 3 if k == "特徴" else 2)
        for j, l in enumerate(l2):
            d.text((cx + 170, y0 + j * (f2.size + 6)), l, font=f2, fill=_a(NAVY, b))
        y0 += max(44, len(l2) * (f2.size + 6) + 10)
    # 禁止・できること・釣れる魚のチップ
    def chips(items, y, fill, fg, outline=None, label=None):
        x = cx + 36
        if label:
            d.text((x, y + 6), label, font=F(FONT_BOLD, 24), fill=_a((110, 125, 140), a))
            x += d.textlength(label, font=F(FONT_BOLD, 24)) + 14
        fc = F(FONT_BOLD, 26)
        for it in items:
            w2 = d.textlength(it, font=fc) + 30
            if x + w2 > cx + cw - 30:
                y += 50
                x = cx + 36
            d.rounded_rectangle([x, y, x + w2, y + 42], radius=21, fill=_a(fill, a), outline=_a(outline, a) if outline else None, width=3)
            d.text((x + 15, y + 5), it, font=fc, fill=_a(fg, a))
            x += w2 + 10
        return y + 54
    c = ease((t - 1.2) / 0.5)
    if c > 0:
        if s.get("ng"):
            y0 = chips(s["ng"], y0 + 6, (255, 236, 234), RED, RED, "禁止")
        if s.get("fish"):
            y0 = chips(s["fish"][:5], y0 + 4, (225, 244, 246), (20, 100, 110), None, "魚")


def scene_rank(img, t, dur, s, meta):
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    items = s["items"][:8]
    n = len(items)
    mx = max(v for _, v, *_ in items) or 1
    rh = min(84, 580 / max(n, 1))
    x0, x1 = 600 if s.get("sprites") else 520, W - 260
    step = max(0.35, min(0.8, (dur - 2) / max(n, 1)))
    for i, it in enumerate(items):
        lab, v = it[0], it[1]
        txt = it[2] if len(it) > 2 else f"{v:g}"
        b = ease((t - 0.5 - (n - 1 - i) * step) / 0.6) if s.get("reverse") else ease((t - 0.5 - i * step) / 0.6)
        if b <= 0:
            continue
        y = 210 + i * rh
        top = i == 0
        d.ellipse([160, y + rh / 2 - 26, 212, y + rh / 2 + 26], fill=_a(GOLD if top else NAVY, b))
        d.text((186, y + rh / 2), str(i + 1), font=F(FONT_BLACK, 30), fill=_a(DARK if top else WHITE, b), anchor="mm")
        if s.get("sprites"):
            im = fish_img(it[3] if len(it) > 3 else lab, 110)
            if im is not None:
                im2 = im.copy()
                im2.putalpha(im2.getchannel("A").point(lambda q: int(q * b)))
                img.paste(im2, (230, int(y + rh / 2 - im2.height / 2)), im2)
        fl, ll = _fitwrap(d, lab, FONT_BOLD, [36, 32, 28], x0 - (360 if s.get("sprites") else 240) - 20, 1)
        d.text((x0 - 20, y + rh / 2), ll[0], font=fl, fill=_a(WHITE, b), anchor="rm")
        w = (x1 - x0) * v / mx * b
        d.rounded_rectangle([x0, y + 12, x0 + max(w, 8), y + rh - 12], radius=12, fill=_a(GOLD if top else TEAL, b))
        d.text((x0 + w + 16, y + rh / 2), txt, font=F(FONT_BLACK, 34), fill=_a(GOLD if top else WHITE, b), anchor="lm")
    if s.get("note"):
        d.text((160, 790), s["note"], font=F(FONT_REG, 26), fill=SUB)


def scene_compare(img, t, dur, s, meta):
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    cols, rows = s["cols"], s["rows"][:7]
    nx = len(cols)
    first = 460
    cw = (W - 320 - first) / max(nx, 1)
    y0 = 200
    d.rounded_rectangle([160, y0, W - 160, y0 + 64], radius=16, fill=(6, 22, 42, 220))
    for j, c in enumerate(cols):
        fc, lc = _fitwrap(d, c, FONT_BOLD, [28, 24, 22], cw - 16, 1)
        d.text((160 + first + j * cw + cw / 2, y0 + 32), lc[0], font=fc, fill=GLOW, anchor="mm")
    rh = min(140, (790 - (y0 + 74)) / max(len(rows), 1))
    big = rh >= 110
    step = max(0.3, min(0.7, (dur - 2) / max(len(rows), 1)))
    for i, r in enumerate(rows):
        b = ease((t - 0.5 - i * step) / 0.4)
        if b <= 0:
            continue
        y = y0 + 74 + i * rh
        d.rounded_rectangle([160, y, W - 160, y + rh - 8], radius=14, fill=_a(CARD, b * 0.96))
        fn, ln = _fitwrap(d, r[0], FONT_BLACK if big else FONT_BOLD, [40, 34, 30] if big else [30, 27, 24], first - 40, 2)
        for k2, l in enumerate(ln):
            d.text((186, y + (rh - 8) / 2 + (k2 - (len(ln) - 1) / 2) * (fn.size + 4)), l, font=fn, fill=_a(NAVY, b), anchor="lm")
        for j, cell in enumerate(r[1:]):
            x = 160 + first + j * cw + cw / 2
            cy = y + (rh - 8) / 2
            col = {"○": (40, 150, 90), "◎": (40, 150, 90), "×": RED, "△": (220, 140, 20), "－": (150, 160, 170)}.get(cell)
            if col:
                d.text((x, cy), cell, font=F(FONT_BLACK, 52 if big else 40), fill=_a(col, b), anchor="mm")
            else:
                fc2, lc2 = _fitwrap(d, cell, FONT_BOLD, [36, 32, 28, 24] if big else [26, 23, 20], cw - 16, 2)
                for k2, l in enumerate(lc2):
                    d.text((x, cy + (k2 - (len(lc2) - 1) / 2) * (fc2.size + 4)), l, font=fc2, fill=_a(NAVY, b), anchor="mm")
    if s.get("note"):
        d.text((160, max(800, y0 + 74 + len(rows) * rh + 4)), s["note"], font=F(FONT_REG, 24), fill=SUB)


def _arrow(d, x0, y0, x1, y1, col, w=16):
    d.line([(x0, y0), (x1, y1)], fill=col, width=w)
    ang = math.atan2(y1 - y0, x1 - x0)
    L = w * 2.6
    p1 = (x1 + math.cos(ang) * L * 0.4, y1 + math.sin(ang) * L * 0.4)
    p2 = (x1 - math.cos(ang - 0.5) * L, y1 - math.sin(ang - 0.5) * L)
    p3 = (x1 - math.cos(ang + 0.5) * L, y1 - math.sin(ang + 0.5) * L)
    d.polygon([p1, p2, p3], fill=col)


def scene_wind(img, t, dur, s, meta):
    """海を上・陸を下にした堤防の図に、風の向きを矢印で（背中から／正面から／横から）"""
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", "風の向きと投げやすさ"), ease(t / 0.4))
    cases = s["cases"][:3]
    n = len(cases)
    gap = 36
    pw = (W - 320 - gap * (n - 1)) / n
    for i, c in enumerate(cases):
        b = ease((t - 0.5 - i * 0.6) / 0.5)
        if b <= 0:
            continue
        x = 160 + i * (pw + gap)
        y = 210
        ph = 520
        panel = Image.new("RGBA", (int(pw), ph), (0, 0, 0, 0))
        pd = ImageDraw.Draw(panel)
        pd.rectangle([0, 0, pw, ph * 0.62], fill=(120, 190, 225))
        for k in range(4):
            yy = 40 + k * 70
            pd.line([(20 + j * 8, yy + 6 * math.sin(j / 3 + t * 2 + k)) for j in range(int(pw / 8) - 4)], fill=(170, 220, 240), width=3)
        pd.rectangle([0, ph * 0.62, pw, ph], fill=(205, 205, 200))
        pd.rectangle([0, ph * 0.62, pw, ph * 0.62 + 14], fill=(150, 150, 150))
        ax = pw / 2
        ay = ph * 0.62 + 40
        pd.ellipse([ax - 16, ay - 50, ax + 16, ay - 18], fill=(30, 40, 60))
        pd.line([(ax, ay - 18), (ax, ay + 40)], fill=(30, 40, 60), width=10)
        pd.line([(ax, ay), (ax + 70, ay - 150)], fill=(60, 60, 60), width=5)
        mask = Image.new("L", panel.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, panel.width, panel.height], radius=28, fill=int(255 * b))
        img.paste(panel, (int(x), y), mask)
        col = {"good": (40, 170, 90), "bad": RED, "mid": (230, 150, 20)}.get(c.get("tone", "mid"))
        k = c["from"]  # "back" / "front" / "side"
        mv = (t * 160) % 120
        if k == "back":
            _arrow(d, x + pw * 0.25, y + ph - 20 - mv * 0.3, x + pw * 0.25, y + 120 - mv * 0.3, _a(col, b))
        elif k == "front":
            _arrow(d, x + pw * 0.75, y + 40 + mv * 0.3, x + pw * 0.75, y + ph - 120 + mv * 0.3, _a(col, b))
        else:
            _arrow(d, x + 30 + mv * 0.3, y + 160, x + pw - 60 + mv * 0.3, y + 160, _a(col, b))
        d.text((x + pw / 2, y + ph + 30), c["label"], font=F(FONT_BLACK, 40), fill=_a(col, b), anchor="ma")
        fs, ls = _fitwrap(d, c.get("text", ""), FONT_BOLD, [28, 25], pw - 20, 2)
        for j, l in enumerate(ls):
            d.text((x + pw / 2, y + ph + 92 + j * (fs.size + 6)), l, font=fs, fill=_a(WHITE, b), anchor="ma")


def scene_stat(img, t, dur, s, meta):
    swim(img, meta.get("sprites") or ["アジ"], t, depth_seed=71, count=3, scale=0.6)
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    st = s["stats"][:3]
    n = len(st)
    gap = 40
    w = (W - 320 - gap * (n - 1)) / n
    for i, (num, unit, cap) in enumerate(st):
        b = ease((t - 0.4 - i * 0.5) / 0.5)
        if b <= 0:
            continue
        x = 160 + i * (w + gap)
        y = 250
        d.rounded_rectangle([x, y, x + w, y + 400], radius=34, fill=_a(CARD, b))
        try:
            val = float(str(num).replace(",", ""))
            cur = val * min(1, b * 1.2)
            shown = f"{cur:,.0f}" if val >= 10 else f"{cur:.1f}"
            if b >= 0.99:
                shown = str(num)
        except ValueError:
            shown = str(num)
        fn = F(FONT_BLACK, 120 if len(shown) <= 4 else 96 if len(shown) <= 6 else 76)
        tw = d.textlength(shown, font=fn)
        fu = F(FONT_BLACK, 44)
        uw = d.textlength(unit, font=fu)
        x2 = x + (w - tw - uw - 8) / 2
        d.text((x2, y + 70), shown, font=fn, fill=_a(RED if i == 0 else NAVY, b))
        d.text((x2 + tw + 8, y + 70 + fn.size - 50), unit, font=fu, fill=_a(NAVY, b))
        fc, lc = _fitwrap(d, cap, FONT_BOLD, [34, 30, 26], w - 50, 3)
        for j, l in enumerate(lc):
            d.text((x + w / 2, y + 250 + j * (fc.size + 8)), l, font=fc, fill=_a((60, 75, 92), b), anchor="ma")


def scene_ladder(img, t, dur, s, meta):
    """出世魚：小さい順に並べて、名前と大きさの目安"""
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    steps = s["steps"][:5]
    n = len(steps)
    span = W - 320
    seg = span / n
    for i, (name, size, sp) in enumerate(steps):
        b = ease((t - 0.5 - i * 0.6) / 0.5)
        if b <= 0:
            continue
        cx = 160 + seg * i + seg / 2
        wfish = 140 + (seg - 170) * (i / max(n - 1, 1))
        im = fish_img(sp, wfish)
        if im is not None:
            im2 = im.copy()
            im2.putalpha(im2.getchannel("A").point(lambda q: int(q * b)))
            img.paste(im2, (int(cx - im2.width / 2), int(470 - im2.height / 2)), im2)
        d.text((cx, 600), name, font=F(FONT_BLACK, 52 if len(name) <= 4 else 42), fill=_a(GOLD if i == n - 1 else WHITE, b), anchor="ma", stroke_width=3, stroke_fill=_a(DARK, b))
        d.text((cx, 676), size, font=F(FONT_BOLD, 32), fill=_a(SUB, b), anchor="ma")
        if i < n - 1:
            ax = cx + seg / 2
            d.polygon([(ax - 12, 455), (ax + 14, 470), (ax - 12, 485)], fill=_a(GOLD, b))
    if s.get("note"):
        fn, ln = _fitwrap(d, s["note"], FONT_BOLD, [30, 26], W - 320, 2)
        for j, l in enumerate(ln):
            d.text((160, 250 + j * 44), l, font=fn, fill=SUB)


def scene_pair(img, t, dur, s, meta):
    """似ている魚の見分け方：左右に並べて、違いを箇条書き"""
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    fish = s["fish"][:2]
    for i, f in enumerate(fish):
        b = ease((t - 0.4 - i * 0.6) / 0.5)
        if b <= 0:
            continue
        x = 160 + i * ((W - 320) / 2 + 20)
        w = (W - 320) / 2 - 20
        d.rounded_rectangle([x, 200, x + w, 790], radius=30, fill=_a(CARD, b))
        im = fish_img(f["sprite"], min(520, w - 120), flip=bool(f.get("flip")))
        if im is not None:
            im2 = im.copy()
            im2.putalpha(im2.getchannel("A").point(lambda q: int(q * b)))
            img.paste(im2, (int(x + w / 2 - im2.width / 2), int(360 - im2.height / 2)), im2)
        d.text((x + w / 2, 480), f["name"], font=F(FONT_BLACK, 56), fill=_a(NAVY, b), anchor="ma")
        c = ease((t - 1.6 - i * 0.6) / 0.5)
        yy = 570
        for p in f["points"][:3]:
            fp, lp = _fitwrap(d, p, FONT_BOLD, [30, 27, 24], w - 110, 2)
            d.ellipse([x + 44, yy + 10, x + 62, yy + 28], fill=_a(GOLD, c))
            for j, l in enumerate(lp):
                d.text((x + 80, yy + j * (fp.size + 6)), l, font=fp, fill=_a((40, 55, 72), c))
            yy += len(lp) * (fp.size + 6) + 14
    vb = ease((t - 1.0) / 0.4)
    if vb > 0:
        d.ellipse([W / 2 - 50, 440, W / 2 + 50, 540], fill=_a(RED, vb))
        d.text((W / 2, 490), "VS", font=F(FONT_BLACK, 44), fill=_a(WHITE, vb), anchor="mm")


FULL.update({"spotcard": scene_spotcard, "rank": scene_rank, "compare": scene_compare, "wind": scene_wind, "stat": scene_stat, "ladder": scene_ladder, "pair": scene_pair})


def scene_tidecurve(img, t, dur, s, meta):
    """1日の潮位の曲線。潮がよく動く時間・夜・ねらい目を色で重ねる"""
    d = ImageDraw.Draw(img, "RGBA")
    heading_full(d, s.get("heading", ""), ease(t / 0.4))
    x0, x1, y0, y1 = 220, W - 180, 240, 700
    d.rounded_rectangle([160, 200, W - 140, 790], radius=30, fill=(255, 255, 255, 240))
    hv = s["hourly"]
    lo, hi = min(hv), max(hv)
    def X(h):
        return x0 + (x1 - x0) * h / 24
    def Y(v):
        return y1 - (y1 - y0) * (v - lo + 10) / (hi - lo + 20)
    sr, ss = s.get("sun", (None, None))
    if sr is not None:
        d.rectangle([X(0), y0, X(sr), y1], fill=(40, 60, 100, 40))
        d.rectangle([X(ss), y0, X(24), y1], fill=(40, 60, 100, 40))
        d.text((X(sr), y1 + 12), f"日の出 {int(sr)}:{int(sr % 1 * 60):02d}", font=F(FONT_BOLD, 24), fill=(200, 120, 20), anchor="ma")
        d.text((X(ss), y1 + 12), f"日の入 {int(ss)}:{int(ss % 1 * 60):02d}", font=F(FONT_BOLD, 24), fill=(200, 120, 20), anchor="ma")
    k = _cur(s, t)
    show_move = k >= s.get("move_at", 1) or not s.get("appear")
    show_win = k >= s.get("win_at", 2) or not s.get("appear")
    if show_move:
        for h in s.get("moving", []):
            d.rectangle([X(h), y0, X(h + 1), y1], fill=(95, 195, 201, 70))
    if show_win:
        for a_, b_ in s.get("windows", []):
            d.rounded_rectangle([X(a_), y0 - 30, X(b_), y0 - 8], radius=10, fill=GOLD)
            d.text(((X(a_) + X(b_)) / 2, y0 - 34), "ねらい目", font=F(FONT_BOLD, 22), fill=(180, 120, 0), anchor="md")
    prog = min(1, t / 1.8)
    pts = [(X(h), Y(v)) for h, v in enumerate(hv) if h <= 23 * prog + 0.01]
    if len(pts) > 1:
        d.line(pts, fill=NAVY, width=7, joint="curve")
    for h in range(0, 25, 3):
        d.text((X(h), y1 + 50), f"{h}時", font=F(FONT_BOLD, 24), fill=(110, 125, 140), anchor="ma")
    for ev in s.get("events", []):
        h = int(ev[1][:2]) + int(ev[1][3:5]) / 60
        if h <= 23 * prog:
            d.ellipse([X(h) - 9, Y(ev[2]) - 9, X(h) + 9, Y(ev[2]) + 9], fill=WHITE, outline=NAVY, width=4)
            d.text((X(h), Y(ev[2]) - (22 if ev[0] == "満" else -22)), f"{ev[0]}潮 {ev[1]}", font=F(FONT_BOLD, 24), fill=NAVY, anchor="md" if ev[0] == "満" else "ma")
    if s.get("label"):
        d.text((W - 170, 220), s["label"], font=F(FONT_BOLD, 26), fill=(110, 125, 140), anchor="ra")


FULL["tidecurve"] = scene_tidecurve


def render(meta, item, tg, total):
    s = item["scene"]
    t = tg - item["start"]
    dur = item["end"] - item["start"]
    img = background(tg)
    cap = None
    for c0, c1, ln in item["cues"]:
        if c0 - 0.15 <= tg <= c1 + R.GAP:
            cap = ln["text"]
    s["_cap"] = cap
    s["_cues"] = [c0 - item["start"] for c0, _, _ in item["cues"]]
    FULL[s["type"]](img, t, dur, s, meta)
    if s["type"] not in ("fact", *OWN_CAPTION):  # 豆知識はカードに同じ文があるので字幕は出さない
        caption(img, cap, t)
    header(img, meta, s.get("chapter", 0), min(1, tg / total))
    return img
