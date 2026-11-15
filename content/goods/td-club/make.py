# TSUREDOKI ANGLER'S CLUB ポリゴン魚種シリーズ（2026-11-15 オーナー案をもとに描き直し）
#   python3 content/goods/td-club/make.py        … svg/ に SVG を書き出す（render.js で PNG に）
# 魚は頭が右。輪郭（top/bottom の点列）とひれを手で決め、中を三角形に分けて色を付ける（ローポリ）。
import json, math, os, random
import numpy as np
from matplotlib.path import Path
from scipy.spatial import Delaunay

OUT = os.path.join(os.path.dirname(__file__), "svg")
os.makedirs(OUT, exist_ok=True)


def hx(c):
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], float)


def rgb(v):
    v = np.clip(v, 0, 255)
    return "#%02x%02x%02x" % tuple(int(round(x)) for x in v)


def mix(a, b, t):
    return hx(a) * (1 - t) + hx(b) * t


def grad(stops, t):
    t = min(max(t, 0), 1)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            return mix(c0, c1, (t - t0) / max(t1 - t0, 1e-6))
    return hx(stops[-1][1])


def smooth(pts, n=6, closed=True):
    # Catmull-Rom で点列をなめらかに
    P = [np.array(p, float) for p in pts]
    out = []
    m = len(P)
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0, p1, p2, p3 = P[(i - 1) % m], P[i], P[(i + 1) % m], P[(i + 2) % m]
        if not closed:
            p0 = P[max(i - 1, 0)]
            p3 = P[min(i + 2, m - 1)]
        for k in range(n):
            t = k / n
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            out.append(q)
    if not closed:
        out.append(P[-1])
    return np.array(out)


def lowpoly(poly, colorfn, seed, density=1.0):
    rnd = random.Random(seed)
    path = Path(poly)
    xs, ys = poly[:, 0], poly[:, 1]
    area = 0.5 * abs(np.dot(xs, np.roll(ys, 1)) - np.dot(ys, np.roll(xs, 1)))
    n_in = int(max(6, area / 1400 * density))
    pts = list(poly[:: max(1, len(poly) // 70)])
    tries = 0
    while n_in > 0 and tries < 20000:
        tries += 1
        p = (rnd.uniform(xs.min(), xs.max()), rnd.uniform(ys.min(), ys.max()))
        if path.contains_point(p, radius=-4):
            pts.append(np.array(p))
            n_in -= 1
    pts = np.array(pts)
    tri = Delaunay(pts)
    out = []
    for s in tri.simplices:
        a, b, c = pts[s]
        cen = (a + b + c) / 3
        if not path.contains_point(cen):
            continue
        col = colorfn(cen[0], cen[1])
        col = col * (1 + rnd.uniform(-0.09, 0.09)) + rnd.uniform(-6, 6)
        out.append((np.array([a, b, c]), rgb(col)))
    return out


def chain_y(chain, x):
    c = sorted(chain, key=lambda p: p[0])
    xs = [p[0] for p in c]
    ys = [p[1] for p in c]
    return float(np.interp(x, xs, ys))


# ───────── 魚種 ─────────
SPECIES = {}

SPECIES["buri"] = dict(
    ja="ブリ", rot=-11,
    top=[(985, 8), (962, -30), (920, -58), (860, -82), (780, -100), (680, -110), (560, -110), (440, -100), (330, -80), (250, -55), (195, -32), (168, -20)],
    bot=[(985, 8), (965, 30), (925, 48), (860, 66), (780, 82), (680, 92), (560, 94), (440, 86), (330, 68), (250, 46), (195, 28), (168, 18)],
    tail=[(180, -20), (130, -70), (70, -140), (24, -196), (62, -110), (104, 0), (62, 110), (24, 196), (70, 140), (130, 70), (180, 18)],
    fins=dict(
        d1=[(650, -106), (632, -134), (606, -142), (576, -134), (548, -108)],
        d2=[(520, -108), (500, -150), (470, -146), (420, -126), (340, -102), (262, -74), (226, -56), (330, -80), (440, -100)],
        an=[(470, 88), (444, 128), (384, 120), (304, 94), (250, 70), (330, 74), (420, 88)],
        pec=[(805, 12), (742, -6), (694, 2), (760, 26)],
        pel=[(762, 84), (724, 124), (704, 114), (734, 88)],
    ),
    body=lambda xn, yn: (grad([(0, "#163a6a"), (0.33, "#2f6eaa"), (0.4, "#e7c437"), (0.5, "#e4c64a"), (0.56, "#c9d6e0"), (1, "#f4f6f8")], yn)),
    fin=dict(d1="#2d557a", d2="#3a6688", an="#d9c25a", pec="#dcc767", pel="#e0cb6c", tail="#cdb43e"),
    eye=(915, -12, 15), gill=[(858, -66), (846, -20), (842, 30), (850, 58)], mouth=[(985, 8), (955, 12)],
)

SPECIES["madai"] = dict(
    ja="真鯛", rot=-10,
    top=[(982, 30), (965, -10), (940, -62), (905, -116), (850, -166), (770, -206), (660, -226), (540, -222), (420, -200), (320, -160), (240, -110), (198, -62), (178, -36)],
    bot=[(982, 30), (965, 56), (930, 92), (870, 132), (780, 166), (660, 182), (540, 176), (420, 152), (320, 116), (240, 74), (198, 44), (178, 30)],
    tail=[(188, -36), (130, -96), (72, -160), (34, -194), (70, -98), (98, 0), (70, 98), (34, 194), (72, 160), (130, 96), (188, 30)],
    fins=dict(
        d1=[(806, -192), (790, -262), (760, -230), (734, -292), (700, -244), (668, -304), (630, -252), (596, -306), (556, -254), (520, -300), (480, -248), (444, -284), (404, -232), (366, -258), (330, -206), (292, -222), (262, -150), (304, -162), (420, -200), (560, -224), (704, -220)],
        an=[(472, 166), (432, 218), (362, 208), (300, 168), (262, 122), (332, 132), (420, 154)],
        pec=[(832, 42), (760, 20), (700, 32), (770, 58)],
        pel=[(762, 162), (732, 224), (702, 208), (722, 166)],
    ),
    body=lambda xn, yn: grad([(0, "#c22e4c"), (0.45, "#e76378"), (0.75, "#f2a8b2"), (1, "#f8dde0")], yn),
    spots=("#56b8ea", 0.0, 0.55, 26),
    fin=dict(d1="#d94d68", an="#e78092", pec="#ee8f9f", pel="#ec8e9e", tail="#d0465f"),
    eye=(905, -42, 19), gill=[(842, -120), (826, -40), (826, 40), (842, 110)], mouth=[(982, 30), (950, 36)],
)

SPECIES["aori"] = dict(ja="アオリイカ", rot=-58, squid=True)

SPECIES["chinu"] = dict(
    ja="チヌ", rot=-10,
    top=[(982, 40), (968, 0), (946, -56), (910, -116), (852, -170), (770, -210), (660, -230), (540, -226), (420, -202), (320, -160), (240, -110), (198, -62), (178, -36)],
    bot=[(982, 40), (966, 66), (930, 100), (870, 136), (780, 166), (660, 182), (540, 176), (420, 152), (320, 116), (240, 74), (198, 44), (178, 30)],
    tail=[(186, -36), (126, -96), (62, -176), (40, -192), (80, -96), (104, 0), (80, 96), (40, 192), (62, 176), (126, 96), (186, 30)],
    fins=dict(
        d1=[(808, -196), (792, -270), (762, -236), (736, -302), (702, -250), (670, -314), (632, -258), (598, -316), (558, -260), (522, -308), (482, -254), (446, -292), (406, -238), (368, -262), (332, -210), (294, -226), (264, -150), (306, -164), (420, -202), (560, -228), (706, -222)],
        an=[(474, 166), (434, 224), (364, 214), (300, 170), (262, 122), (332, 132), (420, 154)],
        pec=[(834, 50), (762, 26), (702, 38), (772, 64)],
        pel=[(764, 162), (734, 228), (704, 212), (724, 166)],
    ),
    body=lambda xn, yn: grad([(0, "#262c33"), (0.45, "#4c555e"), (0.8, "#8d969e"), (1, "#b9c1c8")], yn),
    bars=True,
    fin=dict(d1="#22272d", an="#2c3238", pec="#3a4148", pel="#262b31", tail="#22272d"),
    eye=(904, -34, 18), gill=[(842, -120), (826, -40), (826, 40), (842, 112)], mouth=[(982, 40), (952, 44)],
)

SPECIES["gure"] = dict(
    ja="グレ", rot=-10,
    top=[(976, 22), (960, -26), (926, -82), (862, -142), (762, -188), (640, -208), (520, -202), (400, -178), (300, -138), (226, -88), (188, -46)],
    bot=[(976, 22), (960, 58), (920, 102), (852, 142), (762, 172), (640, 186), (520, 180), (400, 156), (300, 116), (226, 72), (188, 42)],
    tail=[(196, -46), (132, -112), (70, -176), (86, -62), (96, 0), (86, 62), (70, 176), (132, 112), (196, 42)],
    fins=dict(
        d1=[(764, -184), (734, -228), (642, -250), (520, -244), (400, -218), (300, -178), (242, -132), (322, -142), (432, -182), (560, -208), (682, -202)],
        an=[(502, 182), (462, 230), (382, 218), (300, 162), (262, 120), (342, 126), (432, 162)],
        pec=[(822, 44), (752, 28), (702, 42), (762, 64)],
        pel=[(742, 168), (712, 224), (692, 208), (707, 170)],
    ),
    body=lambda xn, yn: grad([(0, "#14212f"), (0.5, "#24394f"), (1, "#3f566d")], yn),
    fin=dict(d1="#121c27", an="#17222e", pec="#26384a", pel="#18232f", tail="#121c27"),
    eye=(902, -18, 16), eyering="#5d8fb8", gill=[(838, -110), (822, -30), (824, 40), (840, 110)], mouth=[(976, 22), (958, 26)],
)

SPECIES["seabass"] = dict(
    ja="シーバス", rot=-11,
    top=[(990, -6), (970, -32), (930, -56), (870, -80), (780, -96), (660, -106), (540, -106), (420, -96), (320, -78), (240, -55), (190, -35), (166, -24)],
    bot=[(992, 12), (982, 30), (958, 46), (908, 60), (840, 72), (760, 80), (660, 88), (540, 88), (420, 80), (320, 64), (240, 45), (190, 28), (166, 20)],
    tail=[(174, -24), (122, -72), (62, -142), (40, -152), (72, -70), (86, 0), (72, 70), (40, 152), (62, 142), (122, 72), (174, 20)],
    fins=dict(
        d1=[(702, -102), (692, -152), (662, -178), (622, -182), (582, -168), (552, -142), (532, -104)],
        d2=[(482, -102), (462, -142), (420, -148), (360, -132), (320, -110), (300, -82), (362, -92), (432, -100)],
        an=[(432, 82), (412, 122), (362, 122), (322, 102), (302, 72), (362, 76)],
        pec=[(832, 12), (772, 0), (732, 12), (786, 32)],
        pel=[(762, 80), (737, 126), (717, 116), (732, 82)],
    ),
    body=lambda xn, yn: grad([(0, "#3f4f5a"), (0.35, "#6f808b"), (0.6, "#c6cfd5"), (1, "#eef1f3")], yn),
    fin=dict(d1="#56666f", d2="#5e6d76", an="#a7b1b8", pec="#9aa6ae", pel="#b4bdc3", tail="#5a6972"),
    eye=(908, -36, 15), gill=[(846, -84), (832, -20), (830, 40), (842, 68)], mouth=[(990, -6), (912, 14)],
)

ORDER = ["buri", "madai", "aori", "chinu", "gure", "seabass"]


def gray(c):
    v = hx(c)
    g = 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]
    g = (g - 128) * 1.12 + 128
    return rgb([g, g, g])


def fish_parts(key):
    sp = SPECIES[key]
    if sp.get("squid"):
        return squid_parts()
    top, bot = sp["top"], sp["bot"]
    body = smooth(top + bot[::-1][:-1], n=5)
    def bodycol(x, y):
        yt, yb = chain_y(top, x), chain_y(bot, x)
        yn = (y - yt) / max(yb - yt, 1)
        return sp["body"](x / 1000, yn)
    parts = []  # (name, poly, tris)
    tl = np.array(sp["tail"], float)
    parts.append(("tail", tl, lowpoly(tl, lambda x, y: hx(sp["fin"]["tail"]) * (0.85 + 0.25 * (x / 200)), seed=7)))
    for fk, pts in sp["fins"].items():
        poly = np.array(pts, float) if fk in ("d1", "d2") else smooth(pts, n=3)
        base = sp["fin"][fk]
        parts.append((fk, poly, lowpoly(poly, lambda x, y, b=base: hx(b), seed=hash(fk) % 1000, density=1.4)))
    tris = lowpoly(body, bodycol, seed=11, density=0.9)
    if sp.get("spots"):
        col, a, b, n = sp["spots"]
        rnd = random.Random(3)
        dots = []
        for _ in range(n * 3):
            x = rnd.uniform(300, 880)
            yt, yb = chain_y(top, x), chain_y(bot, x)
            y = yt + (yb - yt) * rnd.uniform(0.12, b)
            dots.append((x, y))
        parts_spots = dots[:n]
    else:
        parts_spots = []
    parts.append(("body", body, tris))
    deco = dict(spots=parts_spots, spotcol=sp.get("spots", ("#fff",))[0], eye=sp["eye"], gill=sp["gill"], mouth=sp["mouth"],
                eyering=sp.get("eyering", "#c9a640"), bars=(top, bot) if sp.get("bars") else None)
    return parts, deco


def squid_parts():
    parts = []
    mt = [(985, 0), (950, -30), (880, -56), (760, -76), (620, -84), (480, -80), (390, -68), (336, -52)]
    mantle = smooth(mt + [(x, -y) for x, y in mt[::-1]][1:-1], n=5)
    ft = [(975, -6), (930, -84), (840, -150), (700, -184), (560, -178), (452, -150), (392, -104), (372, -70), (480, -84), (620, -90), (760, -80), (880, -58)]
    fin_t = smooth(ft, n=3)
    fin_b = fin_t * np.array([1, -1])
    head = np.array([(300 + 64 * math.cos(a), 62 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 40, endpoint=False)])
    def mcol(x, y):
        return mix("#c99b70", "#8f5f3c", 0.35 + 0.3 * math.sin(x / 70) * math.cos(y / 40)) if True else None
    parts.append(("fin_t", fin_t, lowpoly(fin_t, lambda x, y: hx("#e6cbb0"), seed=21, density=0.8)))
    parts.append(("fin_b", fin_b, lowpoly(fin_b, lambda x, y: hx("#dcc0a3"), seed=22, density=0.8)))
    # 腕（8本）と触腕（2本）：先が細くなる帯
    rnd = random.Random(5)
    arms = []
    specs = [(-34, 190), (-22, 210), (-11, 225), (-3, 232), (3, 228), (12, 220), (24, 205), (36, 185)]
    for i, (ang, ln) in enumerate(specs):
        arms.append((ang, ln, 15, 0.9))
    arms += [(-8, 320, 8, 1.6), (9, 305, 8, -1.6)]
    for j, (ang, ln, w, curl) in enumerate(arms):
        pts_c = []
        for k in range(14):
            t = k / 13
            a = math.radians(180 + ang + curl * 30 * t * t * (1 if ang >= 0 else -1))
            r = ln * t
            pts_c.append((250 + r * math.cos(a), r * math.sin(a) * 1.0 + ang * 0.6 * t))
        pts_c = np.array(pts_c)
        left, right = [], []
        for k in range(len(pts_c)):
            p = pts_c[k]
            q = pts_c[min(k + 1, len(pts_c) - 1)] - pts_c[max(k - 1, 0)]
            nrm = np.array([-q[1], q[0]]) / (np.linalg.norm(q) + 1e-6)
            ww = w * (1 - 0.85 * k / (len(pts_c) - 1))
            if j >= 8 and k > 10:
                ww = w * 1.4
            left.append(p + nrm * ww)
            right.append(p - nrm * ww)
        poly = np.array(left + right[::-1])
        parts.append((f"arm{j}", poly, lowpoly(poly, lambda x, y: hx("#b98b67") * (0.9 + 0.1 * rnd.random()), seed=30 + j, density=2.5)))
    parts.append(("head", head, lowpoly(head, lambda x, y: hx("#b8865f"), seed=40, density=1.5)))
    parts.append(("body", mantle, lowpoly(mantle, mcol, seed=41, density=0.9)))
    rnd2 = random.Random(9)
    spots = [(rnd2.uniform(420, 940), rnd2.uniform(-55, 55)) for _ in range(40)]
    return parts, dict(spots=spots, spotcol="#6e4428", eye=(300, -14, 24), gill=None, mouth=None, eyering="#3fb5a8", bars=None)


def polystr(p):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)


def fish_svg(key, mono, border):
    parts, deco = fish_parts(key)
    C = (lambda c: gray(c)) if mono else (lambda c: c)
    g = []
    # 外側のふち（白）→ 黒い輪郭 → 三角形
    g.append("<g>" + "".join(f'<polygon points="{polystr(p)}" fill="{border}" stroke="{border}" stroke-width="34" stroke-linejoin="round"/>' for _, p, _ in parts) + "</g>")
    g.append("<g>" + "".join(f'<polygon points="{polystr(p)}" fill="#111" stroke="#111" stroke-width="9" stroke-linejoin="round"/>' for _, p, _ in parts) + "</g>")
    for name, p, tris in parts:
        g.append("<g>" + "".join(f'<polygon points="{polystr(t)}" fill="{C(c)}" stroke="{C(c)}" stroke-width="0.8" stroke-linejoin="round"/>' for t, c in tris) + "</g>")
        if name.startswith("arm") or name in ("fin_t", "fin_b"):
            pass
    if deco.get("bars"):
        top, bot = deco["bars"]
        for x in (420, 540, 660, 780):
            yt, yb = chain_y(top, x) + 12, chain_y(bot, x) - 12
            g.append(f'<path d="M{x} {yt} Q{x - 18} {(yt + yb) / 2} {x} {yb}" stroke="#000" stroke-opacity=".18" stroke-width="34" fill="none"/>')
    for (x, y) in deco["spots"]:
        g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5.5" fill="{C(deco["spotcol"])}" opacity=".85"/>')
    if deco.get("gill"):
        g.append(f'<polyline points="{polystr(smooth(deco["gill"], n=4, closed=False))}" fill="none" stroke="#111" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>')
    if deco.get("mouth"):
        (x0, y0), (x1, y1) = deco["mouth"]
        g.append(f'<path d="M{x0} {y0} L{x1} {y1}" stroke="#111" stroke-width="5" stroke-linecap="round"/>')
    ex, ey, er = deco["eye"]
    g.append(f'<circle cx="{ex}" cy="{ey}" r="{er + 3}" fill="#111"/><circle cx="{ex}" cy="{ey}" r="{er}" fill="{C(deco["eyering"])}"/>'
             f'<circle cx="{ex}" cy="{ey}" r="{er * 0.62}" fill="#0b0b0b"/><circle cx="{ex + er * 0.25}" cy="{ey - er * 0.3}" r="{er * 0.22}" fill="#fff"/>')
    return "".join(g)


def logo_svg(ink):
    # TD モノグラム＋釣り針（オリジナル）。ローカル座標 1000×1000。T の縦棒が D の左辺を兼ねる
    return f'''<g fill="{ink}">
<path fill-rule="evenodd" d="M300 120 H600 A370 370 0 0 1 600 860 H300 Z M424 244 H600 A246 246 0 0 1 600 736 H424 Z"/>
<rect x="40" y="120" width="560" height="124"/>
</g>
<g fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round">
<path d="M96 240 L96 360 C96 520 226 530 230 410 L230 350" stroke-width="44"/>
<path d="M230 430 L196 396" stroke-width="22"/>
<circle cx="700" cy="74" r="58" stroke-width="30"/>
</g>
<path d="M200 360 L230 278 L260 360 Z" fill="{ink}"/>'''


def panel(key, mono, dark, text=True, fish=True, logo=True, w=2000, h=2300):
    ink = "#f4f4f2" if dark else "#111111"
    border = "#ffffff"
    sp = SPECIES[key]
    parts = []
    if logo:
        parts.append(f'<g transform="translate(310 60) scale(1.42)">{logo_svg(ink)}</g>')
    if fish:
        rot = sp["rot"]
        sc, cy = (1.25, 860) if sp.get("squid") else (1.42, 960)
        parts.append(f'<g transform="translate(1000 {cy}) rotate({rot}) scale({sc}) translate(-500 0)">{fish_svg(key, mono, border)}</g>')
    if text:
        parts.append(f'<text x="1000" y="1830" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="250" fill="{ink}" letter-spacing="4">TSUREDOKI</text>')
        parts.append(f'<text x="1000" y="1985" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="124" fill="{ink}" letter-spacing="8">ANGLER’S CLUB</text>')
        parts.append(f'<text x="1000" y="2215" text-anchor="middle" font-family="Noto Sans CJK JP" font-weight="900" font-size="190" fill="{ink}">{sp["ja"]}</text>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{"".join(parts)}</svg>'


if __name__ == "__main__":
    for key in ORDER:
        for mono in (False, True):
            for dark in (False, True):
                name = f"{key}-{'mono' if mono else 'color'}-{'dark' if dark else 'light'}"
                open(f"{OUT}/{name}.svg", "w").write(panel(key, mono, dark))
                # キャップ・胸用：文字なし（ロゴと魚だけ）
                svg = panel(key, mono, dark, text=False).replace('viewBox="0 0 2000 2300" width="2000" height="2300"', 'viewBox="0 0 2000 1700" width="2000" height="1700"')
                open(f"{OUT}/{key}-{'mono' if mono else 'color'}-{'dark' if dark else 'light'}-mark.svg", "w").write(svg)
    for dark in (False, True):
        open(f"{OUT}/logo-{'dark' if dark else 'light'}.svg", "w").write(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1500" width="1500" height="1500"><g transform="translate(150 100) scale(1.2)">{logo_svg("#f4f4f2" if dark else "#111111")}</g></svg>')
    print("ok", len(os.listdir(OUT)))
