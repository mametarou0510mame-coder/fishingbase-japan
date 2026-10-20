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
    ls = wrap(d, text, f, W - 360)[:2]
    h = 40 + 70 * len(ls)
    y = H - 60 - h
    d.rounded_rectangle([160, y, W - 160, y + h], radius=28, fill=(6, 22, 42, 215))
    for i, ln in enumerate(ls):
        tw = d.textlength(ln, font=f)
        d.text(((W - tw) / 2, y + 20 + i * 70), ln, font=f, fill=WHITE)


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
    d.rounded_rectangle([140, 110, W - 140, 810], radius=40, fill=(255, 255, 255, 245))
    d.text((200, 140), title, font=F(FONT_BLACK, 56), fill=NAVY)
    d.text((200, 768), note, font=F(FONT_REG, 26), fill=(110, 125, 140))
    return d


def scene_season(img, t, dur, s, meta):
    labels, rates = s["labels"], s["rates"]
    if len(labels) == 1:
        d = chart_panel(img, f"{labels[0]}が釣れる時期", s["note"])
        r = rates[0]
        mx = max(r) or 1
        best = [m for m in range(12) if r[m] >= mx * 0.55]
        x0, y0, bw, gap, hmax = 230, 700, 100, 22, 430
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
        x0, y0, cw, ch = 470, 260, 100, min(64, 480 // len(labels))
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
        h = 380 * (vals[i] / (mx * 1.1)) * e
        col = GLOW if vals[i] == mx else TEAL
        d.rounded_rectangle([x, 700 - h, x + 220, 700], radius=18, fill=col)
        d.text((x + 110, 708), f"{k}潮", font=F(FONT_BLACK, 40), fill=NAVY, anchor="ma")
        if e > 0.9:
            d.text((x + 110, 700 - h - 60), f"{vals[i]:.2f}倍", font=F(FONT_BLACK, 40), fill=RED if vals[i] == mx else NAVY, anchor="ma")
    d.line([(380, 700 - 380 / 1.1 / mx), (1600, 700 - 380 / 1.1 / mx)], fill=(200, 80, 60), width=3)
    d.text((1610, 700 - 380 / 1.1 / mx), "平均", font=F(FONT_BOLD, 26), fill=(200, 80, 60), anchor="lm")


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
    box_h = 720
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
    mxn = max(p["n"] for p in pins)
    for i, p in enumerate(pins):
        if not inbay(p):
            continue
        e = ease((t - 0.8 - i * 0.35) / 0.4)
        if e <= 0:
            continue
        x = ox + (p["lon"] - view["lon0"]) * view["c"] * view["k"] * k
        y = oy + (view["lat1"] - p["lat"]) * view["k"] * k
        r = (14 + 22 * p["n"] / mxn) * e
        d.ellipse([x - r - 8, y - r - 8, x + r + 8, y + r + 8], fill=(227, 65, 43, 70))
        d.ellipse([x - r, y - r, x + r, y + r], fill=RED, outline=WHITE, width=4)
        d.text((x, y), str(i + 1), font=F(FONT_BLACK, int(max(18, r))), fill=WHITE, anchor="mm")
    # 右の一覧
    lx = ox + bw + 60
    d.text((lx, 110), f"最近、{s['label']}が", font=F(FONT_BLACK, 50), fill=WHITE)
    d.text((lx, 175), "釣れている釣り場", font=F(FONT_BLACK, 50), fill=GLOW)
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
        d.text((W - 100, y + 14), f"{p['n']}件", font=F(FONT_BOLD, 34), fill=GLOW, anchor="ra")
    d.text((lx, 270 + min(7, len(pins)) * 82 + 6), "直近45日の、施設などの公開釣果の件数", font=F(FONT_REG, 26), fill=SUB)


FULL = {"hook": scene_hook, "fact": scene_fact, "season": scene_season, "tide": scene_tide, "map": scene_map}
NO_BG_CAPTION = {"map"}  # 地図は字幕を下に出す


def render(meta, item, tg, total):
    s = item["scene"]
    t = tg - item["start"]
    dur = item["end"] - item["start"]
    img = background(tg)
    FULL[s["type"]](img, t, dur, s, meta)
    cap = None
    for c0, c1, ln in item["cues"]:
        if c0 - 0.15 <= tg <= c1 + R.GAP:
            cap = ln["text"]
    if s["type"] != "fact":  # 豆知識はカードに同じ文があるので字幕は出さない
        caption(img, cap, t)
    header(img, meta, s.get("chapter", 0), min(1, tg / total))
    return img
