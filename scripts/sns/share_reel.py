# ツレドキHP紹介リール（「釣り仲間に送って」版）1080x1920
#   python scripts/sns/share_reel.py . <out.mp4> [--voice]   （--voice は VOICEVOX が必要）
import math, os, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, f"{REPO}/scripts/sns")
from draw import FONT_BLACK, FONT_BOLD, GLOW, NAVY, NAVY2, RED, TEAL, WHITE, font, logo, float_mark  # noqa

W, H, FPS = 1080, 1920, 30
A = f"{REPO}/content/sns/app-intro"
SKY = (150, 205, 240)
_f = {}


def F(p, s):
    if (p, s) not in _f:
        _f[(p, s)] = font(p, s)
    return _f[(p, s)]


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def back(x):  # 少し行き過ぎて戻る
    x = max(0.0, min(1.0, x))
    c = 1.7
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


# ---------- 部品（RGBAの画像を作る） ----------
def text_img(s, size, color=WHITE, fp=FONT_BLACK, stroke=0, sc=(8, 24, 44)):
    f = F(fp, size)
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = d.textbbox((0, 0), s, font=f, stroke_width=stroke)
    im = Image.new("RGBA", (r - l + 20, b - t + 20), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10 - l, 10 - t), s, font=f, fill=color, stroke_width=stroke, stroke_fill=sc)
    return im


def pill(s, size, bg, fg=WHITE, padx=34, pady=16, fp=FONT_BLACK):
    t = text_img(s, size, fg, fp)
    im = Image.new("RGBA", (t.width + padx * 2, t.height + pady * 2), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=im.height // 2, fill=bg)
    im.alpha_composite(t, (padx, pady))
    return im


def card(s, size=46, bg=WHITE, fg=(20, 40, 64), tilt=0):
    t = text_img(s, size, fg, FONT_BLACK)
    im = Image.new("RGBA", (t.width + 60, t.height + 36), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=18, fill=bg)
    im.alpha_composite(t, (30, 18))
    sh = Image.new("RGBA", (im.width + 40, im.height + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((20, 28, im.width + 20, im.height + 28), radius=18, fill=(0, 0, 0, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    sh.alpha_composite(im, (20, 20))
    return sh.rotate(tilt, resample=Image.BICUBIC, expand=True)


def phone_frame(bw, bh):
    pad = 20
    fr = Image.new("RGBA", (bw + pad * 2, bh + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(fr).rounded_rectangle((0, 0, fr.width - 1, fr.height - 1), radius=64, fill=(14, 18, 24))
    m = Image.new("L", (bw, bh), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=46, fill=255)
    return fr, m, pad


class Phone:
    """スクリーンショットを、スマホの枠の中でスクロールさせる"""

    def __init__(self, path, bw, bh, y0, y1):
        sc = Image.open(path).convert("RGB")
        k = bw / sc.width
        self.sc = sc.resize((bw, int(sc.height * k)), Image.LANCZOS)
        self.bw, self.bh = bw, bh
        self.y0, self.y1 = int(y0 * k), int(y1 * k)
        self.fr, self.m, self.pad = phone_frame(bw, bh)
        sh = Image.new("RGBA", (self.fr.width + 100, self.fr.height + 100), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((50, 66, self.fr.width + 50, self.fr.height + 66), radius=64, fill=(0, 0, 0, 140))
        self.sh = sh.filter(ImageFilter.GaussianBlur(26))

    def at(self, p):
        y = int(self.y0 + (self.y1 - self.y0) * p)
        y = max(0, min(y, self.sc.height - self.bh))
        im = self.sh.copy()
        fr = self.fr.copy()
        fr.paste(self.sc.crop((0, y, self.bw, y + self.bh)), (self.pad, self.pad), self.m)
        im.alpha_composite(fr, (50, 50))
        return im


# ---------- 背景 ----------
def make_bg():
    bg = Image.new("RGB", (W, H))
    top, bot = np.array((10, 30, 56), float), np.array((20, 64, 108), float)
    g = np.linspace(0, 1, H)[:, None]
    arr = (top * (1 - g) + bot * g)[:, None, :].repeat(W, 1)
    bg = Image.fromarray(arr.astype(np.uint8))
    return bg.convert("RGBA")


BG = make_bg()


def draw_bg(t):
    im = BG.copy()
    d = ImageDraw.Draw(im, "RGBA")
    for j, (amp, per, alpha, y) in enumerate([(18, 520, 40, 1560), (24, 640, 55, 1640), (30, 760, 70, 1730)]):
        ph = t * (0.6 + j * 0.25)
        pts = [(x, y + amp * math.sin(x / per * 2 * math.pi + ph)) for x in range(0, W + 8, 8)]
        d.polygon(pts + [(W, H), (0, H)], fill=(60, 140, 200, alpha))
    return im


def put(im, el, cx, cy, a=1.0, s=1.0, anchor="c"):
    if a <= 0:
        return
    e = el
    if abs(s - 1) > 1e-3:
        e = el.resize((max(1, int(el.width * s)), max(1, int(el.height * s))), Image.BICUBIC)
    if a < 1:
        e = e.copy()
        e.putalpha(e.getchannel("A").point(lambda v: int(v * a)))
    x = int(cx - e.width / 2) if anchor == "c" else int(cx)
    im.alpha_composite(e, (x, int(cy - e.height / 2)))


def rise(im, el, cx, cy, t, t0, dur=0.45, dy=60, anchor="c"):
    p = ease((t - t0) / dur)
    put(im, el, cx, cy + dy * (1 - p), p, anchor=anchor)


def pop(im, el, cx, cy, t, t0, dur=0.4):
    p = (t - t0) / dur
    if p <= 0:
        return
    put(im, el, cx, cy, min(1, p * 2), 0.6 + 0.4 * back(p))


# ---------- 素材 ----------
LOGO = Image.new("RGBA", (520, 120), (0, 0, 0, 0))
logo(ImageDraw.Draw(LOGO), 10, 10, 90)

S1 = dict(
    a=text_img("釣り仲間と", 64, SKY, FONT_BOLD),
    b=text_img("「明日どこ行く？」", 104, WHITE),
    c=text_img("のたびに、", 64, SKY, FONT_BOLD),
    d=text_img("潮・天気・風・釣果を", 66, WHITE),
    e=text_img("別々に調べてない？", 92, GLOW),
    chips=[card(s, 44, tilt=r) for s, r in [("潮見表", -6), ("天気予報", 5), ("風速", -4), ("波の高さ", 7), ("釣果ブログ", -5), ("料金・ルール", 4)]],
)
S2 = dict(
    a=text_img("ツレドキなら", 70, SKY, FONT_BOLD),
    b=text_img("ぜんぶ1ページ。", 120, WHITE),
    tag=pill("地図で釣り場をタップするだけ", 44, RED),
    ph=Phone(f"{A}/map.png", 600, 1000, 0, 500),
)
S3 = dict(
    tag=pill("全国 約240地点", 44, TEAL, (10, 30, 56)),
    a=text_img("いま「上げ何分」か", 84, WHITE),
    b=text_img("ひと目でわかる", 84, GLOW),
    ph=Phone(f"{A}/tide.png", 600, 1000, 250, 1300),
    c=card("実測潮位つき", 42, GLOW, (20, 30, 40), tilt=-4),
)
S4 = dict(
    tag=pill("行く日と時間が決まる", 44, RED),
    a=text_img("「釣りどき指数」を", 84, WHITE),
    b=text_img("7日先まで", 108, GLOW),
    ph=Phone(f"{A}/shio.png", 600, 1000, 0, 450),
)
gy = Image.open(f"{A}/gyotaku-sample.png").convert("RGBA")
gy = gy.resize((900, int(900 * gy.height / gy.width)), Image.LANCZOS)
gsh = Image.new("RGBA", (gy.width + 60, gy.height + 60), (0, 0, 0, 0))
ImageDraw.Draw(gsh).rectangle((30, 42, gy.width + 30, gy.height + 42), fill=(0, 0, 0, 130))
gsh = gsh.filter(ImageFilter.GaussianBlur(16))
gsh.alpha_composite(gy, (30, 30))
S5 = dict(
    tag=pill("釣ったあとも楽しい", 44, TEAL, (10, 30, 56)),
    a=text_img("写真から", 76, SKY, FONT_BOLD),
    b=text_img("デジタル魚拓", 112, WHITE),
    g=gsh.rotate(-3, resample=Image.BICUBIC, expand=True),
    c=text_img("仲間に自慢しよう", 72, GLOW),
)
badges = []
for s in ["完全無料", "登録なし", "LINE追加なし", "アプリ不要"]:
    im = Image.new("RGBA", (440, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 439, 149), radius=30, fill=(255, 255, 255, 235))
    cx = 62
    d.ellipse((cx - 30, 45, cx + 30, 105), fill=TEAL)
    d.line([(cx - 15, 75), (cx - 4, 87), (cx + 17, 62)], fill=WHITE, width=9, joint="curve")
    t = text_img(s, 52 if len(s) < 6 else 44, (16, 40, 70))
    im.alpha_composite(t, (110 + (320 - t.width) // 2, (150 - t.height) // 2))
    badges.append(im)
S6 = dict(
    a=text_img("しかも", 70, SKY, FONT_BOLD),
    badges=badges,
    b=text_img("リンクを送るだけで、", 66, WHITE),
    c=text_img("仲間もすぐ見られる。", 84, GLOW),
)


def plane(size=220):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size
    d.polygon([(s * .08, s * .45), (s * .92, s * .12), (s * .62, s * .9), (s * .48, s * .56)], fill=WHITE)
    d.polygon([(s * .48, s * .56), (s * .92, s * .12), (s * .40, s * .62)], fill=(200, 220, 240))
    return im


S7 = dict(
    plane=plane(),
    a=text_img("このリール、", 84, WHITE),
    b=text_img("釣り仲間に", 120, GLOW),
    c=text_img("送ってください。", 120, GLOW),
    d=text_img("次の釣行の相談は、ツレドキで。", 54, WHITE, FONT_BOLD),
    e=pill("プロフィールのリンクから", 50, RED),
    f=text_img("「ツレドキ 釣り」で検索", 46, SKY, FONT_BOLD),
)

# ---------- シーン ----------
SC = [3.4, 3.4, 3.6, 3.4, 3.4, 4.0, 4.6]
# ナレーション（1場面に1つ）
LINES = [
    "釣り仲間と、明日どこ行く？ってなるたびに、潮や天気、風、釣果を、別々に調べてませんか？",
    "ツレドキなら、ぜんぶ1ページ。地図で釣り場をタップするだけです。",
    "全国約240地点の潮。いま上げ何分か、ひと目でわかります。",
    "関西の釣り場なら、釣りどき指数を、7日先までチェックできます。",
    "釣った魚は、写真からデジタル魚拓に。仲間に自慢しましょう。",
    "しかも完全無料。登録も、LINEの追加も、アプリもいりません。リンクを送るだけで、仲間もすぐ見られます。",
    "このリール、釣り仲間に送ってください。次の釣行の相談は、ツレドキで。",
]
VOICE = []
if "--voice" in sys.argv:
    sys.path.insert(0, f"{REPO}/scripts/video")
    import narrate  # noqa: E402
    for i, ln in enumerate(LINES):
        wp = f"{OUT}.v{i}.wav"
        sec = narrate.synth(ln, wp)
        VOICE.append(wp)
        SC[i] = max(SC[i], sec + (0.9 if i == len(LINES) - 1 else 0.45))
STARTS = np.cumsum([0] + SC[:-1])
TOTAL = sum(SC)
POPS = []  # 効果音のタイミング


def scene1(im, t):
    rise(im, S1["a"], W / 2, 330, t, 0.0)
    pop(im, S1["b"], W / 2, 450, t, 0.15)
    rise(im, S1["c"], W / 2, 570, t, 0.35)
    pos = [(250, 760), (760, 740), (300, 920), (780, 900), (260, 1080), (770, 1070)]
    for i, (ch, (x, y)) in enumerate(zip(S1["chips"], pos)):
        tt = 0.6 + i * 0.13
        jig = 6 * math.sin(t * 5 + i) if t > tt + 0.4 else 0
        pop(im, ch, x + jig, y, t, tt)
    rise(im, S1["d"], W / 2, 1260, t, 1.6)
    pop(im, S1["e"], W / 2, 1380, t, 1.8)


def scene2(im, t):
    rise(im, S2["a"], W / 2, 250, t, 0.0)
    pop(im, S2["b"], W / 2, 380, t, 0.12)
    p = ease((t - 0.3) / 0.6)
    im_ph = S2["ph"].at(ease((t - 0.9) / 2.4))
    put(im, im_ph, W / 2, 1010 + 400 * (1 - p), p)
    pop(im, S2["tag"], W / 2, 1490, t, 0.7)


def scene3(im, t):
    pop(im, S3["tag"], W / 2, 220, t, 0.0)
    rise(im, S3["a"], W / 2, 340, t, 0.15)
    rise(im, S3["b"], W / 2, 450, t, 0.3)
    p = ease((t - 0.3) / 0.6)
    put(im, S3["ph"].at(ease((t - 0.9) / 2.6)), W / 2, 1060 + 400 * (1 - p), p)
    pop(im, S3["c"], 820, 760, t, 1.2)


def scene4(im, t):
    pop(im, S4["tag"], W / 2, 220, t, 0.0)
    rise(im, S4["a"], W / 2, 345, t, 0.15)
    pop(im, S4["b"], W / 2, 470, t, 0.3)
    p = ease((t - 0.3) / 0.6)
    put(im, S4["ph"].at(ease((t - 0.9) / 2.4)), W / 2, 1080 + 400 * (1 - p), p)


def scene5(im, t):
    pop(im, S5["tag"], W / 2, 250, t, 0.0)
    rise(im, S5["a"], W / 2, 380, t, 0.15)
    pop(im, S5["b"], W / 2, 500, t, 0.3)
    p = ease((t - 0.5) / 0.6)
    put(im, S5["g"], W / 2, 920, p, 0.92 + 0.08 * p + 0.02 * max(0, t - 1.1) / 2.3)
    pop(im, S5["c"], W / 2, 1330, t, 1.3)


def scene6(im, t):
    rise(im, S6["a"], W / 2, 300, t, 0.0)
    pos = [(300, 500), (780, 500), (300, 690), (780, 690)]
    for i, (b, (x, y)) in enumerate(zip(S6["badges"], pos)):
        pop(im, b, x, y, t, 0.25 + i * 0.22)
    rise(im, S6["b"], W / 2, 980, t, 1.4)
    pop(im, S6["c"], W / 2, 1100, t, 1.6)
    # 送る→届く：スマホ2台の間を紙飛行機が飛ぶ
    if t > 2.0:
        d = ImageDraw.Draw(im)
        for cx in (260, 820):
            d.rounded_rectangle((cx - 80, 1240, cx + 80, 1520), radius=26, outline=WHITE, width=8)
            d.rounded_rectangle((cx - 52, 1280, cx + 52, 1330), radius=10, fill=TEAL)
            d.rounded_rectangle((cx - 52, 1350, cx + 30, 1380), radius=8, fill=(120, 160, 200))
        k = ((t - 2.0) % 1.2) / 1.2
        x = 340 + (740 - 340) * k
        y = 1330 - 120 * math.sin(math.pi * k)
        put(im, S7["plane"], x, y, 1 - max(0, k - 0.8) * 5, 0.42)


def scene7(im, t):
    k = ease(t / 0.8)
    put(im, S7["plane"], 200 + 340 * k, 470 - 180 * k + 10 * math.sin(t * 4), min(1, t * 3), 1.0)
    rise(im, S7["a"], W / 2, 650, t, 0.3)
    pop(im, S7["b"], W / 2, 790, t, 0.5)
    pop(im, S7["c"], W / 2, 930, t, 0.7)
    rise(im, S7["d"], W / 2, 1100, t, 1.3)
    pp = 1 + 0.04 * math.sin(max(0, t - 2.0) * 6) if t > 2.0 else 1
    p = (t - 1.6) / 0.4
    if p > 0:
        put(im, S7["e"], W / 2, 1250, min(1, p * 2), (0.6 + 0.4 * back(p)) * pp)
    rise(im, S7["f"], W / 2, 1360, t, 1.9)
    rise(im, LOGO, W / 2 + 20, 1500, t, 2.2)


SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7]
# 効果音を鳴らす時刻（主な文字が出るところ）
for st, ts in zip(STARTS, [[0.15, 0.6, 0.73, 0.86, 0.99, 1.12, 1.25, 1.8], [0.12, 0.7], [0.0, 1.2], [0.0, 0.3], [0.0, 0.3, 1.3], [0.25, 0.47, 0.69, 0.91, 1.6], [0.5, 0.7, 1.6]]):
    POPS += [st + x for x in ts]


def frame(t):
    im = draw_bg(t)
    i = int(np.searchsorted(STARTS, t, side="right") - 1)
    lt = t - STARTS[i]
    SCENES[i](im, lt)
    # 場面の切り替え：白いフラッシュを一瞬
    if i > 0 and lt < 0.12:
        im.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(120 * (1 - lt / 0.12)))))
    # 最後は少し暗くして終わる
    if t > TOTAL - 0.3:
        im.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * (t - TOTAL + 0.3) / 0.3 * 0.5))))
    return im.convert("RGB")


def audio(path):
    sr = 44100
    n = int(TOTAL * sr)
    tt = np.arange(n) / sr
    out = np.zeros(n, np.float32)
    # 明るいビート（キック＋ハイハット＋ベース、BPM 120）
    beat = 0.5
    rng = np.random.default_rng(1)
    for k in range(int(TOTAL / beat)):
        s = int(k * beat * sr)
        L = int(0.25 * sr)
        x = np.arange(L) / sr
        kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-x * 30)) * x) * np.exp(-x * 14) * 0.35
        out[s:s + L] += kick[: n - s] if s + L > n else kick
        hs = int((k * beat + beat / 2) * sr)
        HL = int(0.05 * sr)
        hat = rng.standard_normal(HL).astype(np.float32) * np.exp(-np.arange(HL) / sr * 90) * 0.06
        out[hs:hs + HL] += hat[: max(0, n - hs)]
    roots = [220.0, 174.6, 261.6, 196.0]  # A F C G
    for k in range(int(TOTAL / (beat * 4)) + 1):
        f0 = roots[k % 4]
        for j, mul in enumerate([1, 1.25 if k % 4 in (0,) else 1.2, 1.5]):
            pass
        for j in range(8):  # 8分のベース
            s = int((k * beat * 4 + j * beat / 2) * sr)
            L = int(0.22 * sr)
            if s >= n:
                break
            x = np.arange(min(L, n - s)) / sr
            out[s:s + len(x)] += (np.sign(np.sin(2 * np.pi * f0 / 2 * x)) * 0.5 + np.sin(2 * np.pi * f0 / 2 * x) * 0.5) * np.exp(-x * 9) * 0.07
        # パッド（和音）
        s = int(k * beat * 4 * sr)
        L = int(beat * 4 * sr)
        x = np.arange(min(L, max(0, n - s))) / sr
        env = np.minimum(1, x / 0.15) * np.minimum(1, (beat * 4 - x) / 0.2)
        third = 1.2 if k % 4 == 0 else 1.25 if k % 4 in (1, 2, 3) else 1.2
        for mul in (1, third, 1.5, 2):
            out[s:s + len(x)] += np.sin(2 * np.pi * f0 * mul * x) * env * 0.025
    # ポップ音
    for p0 in POPS:
        s = int(p0 * sr)
        L = int(0.12 * sr)
        x = np.arange(min(L, n - s)) / sr
        out[s:s + len(x)] += np.sin(2 * np.pi * (600 + 900 * x / 0.12) * x) * np.exp(-x * 40) * 0.18
    fade = np.minimum(1, np.minimum(tt / 0.3, (TOTAL - tt) / 1.0))
    out = out * fade * (0.45 if VOICE else 0.9)
    for i, vp in enumerate(VOICE):
        with wave.open(vp) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            fr = w.getframerate()
        a = np.interp(np.arange(0, len(a), fr / sr), np.arange(len(a)), a)
        st = int((STARTS[i] + 0.15) * sr)
        seg = a[: max(0, n - st)]
        out[st:st + len(seg)] += seg * 1.1
    out = np.clip(out, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    if len(sys.argv) > 3 and sys.argv[3] == "--stills":
        for i, st in enumerate(STARTS):
            frame(st + SC[i] - 0.3).save(f"{OUT}.s{i}.jpg", quality=85)
        sys.exit()
    wav = OUT + ".wav"
    audio(wav)
    nf = int(TOTAL * FPS)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-i", wav, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                          "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for k in range(nf):
        p.stdin.write(frame(k / FPS).tobytes())
    p.stdin.close(); p.wait()
    for f in [wav] + VOICE:
        os.remove(f)
    print(OUT, TOTAL)
