# 船のキャスティング（cg-nabura）の冒頭：ナブラの下。キャスティングで投げたメタルジグ（約11cm）を、船のほう（-x）へ
# 速く巻き上げる（ナブラが沈んだら、カウントダウンで沈めて速巻き：シマノの解説）。ブリ（Fish Kit buri、CC0）がうしろ（+x）から
# 追ってきて、終わり近くで食う。うしろの上を、ブリの群れが横切る。surf.py をもとにした。魚の動きはイメージ。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0、水面は z≈14（単位 m）。
import math
from mathutils import Vector

FISH = "buri"
FISH_LEN = 0.75
LURE = "jig"
SEC = 13.5          # 冒頭の章（見積もり約9秒・本番の声で約11.5秒）より長く
CAM_OFF = (0.30, -1.55, -0.25)
LENS = 32
CAM_KMAX = 1.7
JIG_LEN = 0.13   # 見やすいように少し大きく
JIG_W = 1.0
LINE_DIR = (-1.0, 0.0, 0.45)   # 糸は船（-x）の竿先へ、上へのびる

V_R = 0.85                     # 船のほうへ進む速さ m/s（画面の中で追えるように遅め）
VZ = 0.22                      # 上がる速さ m/s
Z0 = 6.0
X0 = 2.0
T_BITE = 10.6
T_DASH = T_BITE - 0.5
T_THUMB = T_BITE + 0.25
THUMB_K = 1.3
THUMB_SHIFT = -0.22


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def jig(t):
    t = max(t, 0.0)
    # 速巻き：一定の速さで、小さく左右にゆれながら、斜め上へ
    return Vector((X0 - V_R * t, 0.03 * math.sin(2 * math.pi * 1.8 * t), Z0 + VZ * t + 0.02 * math.sin(2 * math.pi * 3.6 * t)))


def jig_axis_free(t):
    """頭から尾への向き（頭は進む向き -x・少し上）。速巻きで小さく左右にふるえる"""
    a = Vector((1.0, 0.0, -0.25)).normalized()
    w = 0.22 * math.sin(2 * math.pi * 3.6 * t)
    return Vector((a.x * math.cos(w), a.x * math.sin(w), a.z)).normalized()


def jig_smooth(t):
    acc = Vector((0, 0, 0))
    for i in range(13):
        acc += jig(t - 0.6 + i * 0.1)
    return acc / 13


S0 = Vector((2.3, 0.7, 5.5))


def follow(t):
    """ジグのうしろ（+x）・少し下・少し奥。近づいていく"""
    k = sstep(2.0, T_DASH, t)
    return jig_smooth(t) + Vector((0.5 - 0.25 * k + 0.04 * math.sin(1.1 * t), 0.08 * math.sin(0.7 * t) + 0.08, -0.12 + 0.08 * k))


def snout_pre(t):
    S = S0.lerp(follow(t), sstep(0.0, 2.6, t))
    return S.lerp(jig(t) + Vector((0.01, 0, 0.0)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)

def snout(t):
    if t < T_BITE:
        p = snout_pre(t)
    else:
        u = t - T_BITE
        # 掛かると首を振りながら、糸に引かれて岸側（-x）へ、少し上へ
        p = SB + Vector((-0.5 * u, 0.06 * math.sin(2 * math.pi * 2.6 * u), 0.12 * u))
    return p


def heading(t):
    if t < T_BITE:
        v = snout(t + 0.12) - snout(t - 0.12)
        d = v.normalized() if v.length > 0.01 else Vector((-1, 0, 0))
        to = jig(t) - snout(t)
        if to.length > 1e-4:
            d = d.lerp(to.normalized(), 0.6 * sstep(1.5, 3.2, t)).normalized()
        if d.x > -0.2:   # 前（-x）を向く。うしろ向きに進まない
            d = Vector((-0.2, d.y, d.z)).normalized()
    else:
        d = Vector((-1, 0, 0))
    h = math.hypot(d.x, d.y) or 1.0
    d = Vector((d.x / h, d.y / h, max(-0.35, min(0.35, d.z))))
    u = t - T_BITE
    yaw = 0.4 * math.sin(2 * math.pi * 2.2 * u)
    hk = Vector((-math.cos(yaw), math.sin(yaw), 0.15)).normalized()
    return d.normalized().lerp(hk, sstep(T_BITE - 0.05, T_BITE + 0.35, t)).normalized()


def lure_now(t):
    if t < T_BITE:
        return jig(t)
    d = heading(t)
    return snout(t) + d * 0.01 + Vector((0, 0, 0.01))


def lure_axis(t):
    if t < T_BITE:
        return jig_axis_free(t)
    a = (-heading(t) * 0.8 + Vector((0, 0, -0.5))).normalized()
    return jig_axis_free(T_BITE).lerp(a, sstep(T_BITE, T_BITE + 0.3, t)).normalized()


def swim(t):
    def freq(x):
        if x < T_DASH:
            return 1.6 + 0.4 * sstep(0, 3, x)
        if x < T_BITE:
            return 4.5
        return 3.8
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.07 + 0.05 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def sep(t):
    real = min((lure_now(t) - snout(t)).length, 3.0)
    return 0.8 + (real - 0.8) * sstep(0.5, 2.5, t)


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.22
        k = sstep(0.0, 2.0, x)
        return jig_smooth(x).lerp(jig_smooth(x) * 0.5 + body * 0.5, k) + Vector((0, 0, 0.02)) if x < T_BITE else lure_now(x) * 0.4 + body * 0.6
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


def focus(t):
    return jig(t).lerp(snout(t), sstep(0.5, 3.0, t))


# うしろの上を横切るブリの群れ（主役とジグからは離す：y は 2m 以上うしろ）
SCHOOL = [
    (6.0, 2.6, 7.6, 0.70, 0.0),
    (6.9, 3.2, 8.3, 0.78, 1.3),
    (5.3, 3.9, 7.9, 0.66, 2.1),
    (7.7, 2.9, 9.0, 0.74, 0.7),
    (4.7, 4.6, 8.7, 0.80, 2.9),
    (8.5, 3.6, 9.6, 0.72, 1.9),
]


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 - 1.0 * t, y0 + 0.1 * math.sin(0.5 * t + ph), z0 + 0.15 * math.sin(0.8 * t + ph)))
    d = Vector((-1.0, -0.05 * math.cos(0.5 * t + ph), -0.12 * math.cos(0.8 * t + ph))).normalized()
    return p, d, (1.7 * t + ph, 0.07), ln
