# サーフ：メタルジグ（30g・約8cm）をストップ＆ゴーで岸へ（-x）引く。底から少し上を通す。
# マゴチ（Fish Kit magochi、CC0）が沖側（+x）のうしろから寄ってきて、ジグについて泳ぎ、止めた瞬間に食う。
# 釣り方：Honda釣り倶楽部「ヒラメ釣り徹底攻略」STEP3（底まで沈めて5〜7回巻いて1秒止める）。魚の動きはイメージ。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。魚の下端は海底から 0.2m 以上（下の確かめで）
import math
from mathutils import Vector

FISH = "magochi"
FISH_LEN = 0.5
LURE = "jig"
SEC = 11.0          # 冒頭の章（約9〜10秒）より少し長く
CAM_OFF = (0.30, -1.7, -0.22)
LENS = 34
CAM_KMAX = 2.6
JIG_LEN = 0.08
JIG_W = 0.75        # 30g の小さめのジグ（幅と厚みを細く）
LINE_DIR = (-1.0, 0.0, 0.14)   # 糸は岸（-x）の竿先へ、少し上へのびる

P_R, P_S = 1.6, 0.9            # 巻く・止める（1回の長さ）
P = P_R + P_S
V_R = 0.55                     # 巻いている間に岸へ進む速さ m/s（画面の中で追えるように遅め）
Z0, DZ = 0.38, 0.22            # 止めたときの高さ・巻くと上がる量（底から少し上）
X0 = 1.2
T_BITE = 7.1                   # 3回目の「止める」の途中で食う
T_DASH = T_BITE - 0.4
T_THUMB = T_BITE + 0.25
THUMB_K = 1.25
THUMB_SHIFT = -0.22


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def prog(u):
    """1回の中で進む量（巻く間は一定、止めるとすこし惰性で進む）"""
    if u < P_R:
        return u
    return P_R + 0.12 * (1 - math.exp(-(u - P_R) / 0.25))


A = prog(P)


def phase(t):
    t = max(t, 0.0)
    n = int(math.floor(t / P))
    return n, t - n * P


def jig(t):
    n, u = phase(t)
    x = X0 - V_R * (n * A + prog(u))
    if u < P_R:
        z = Z0 + DZ * sstep(0.0, P_R, u)
    else:
        z = Z0 + DZ * (1 - sstep(P_R, P, u))
    return Vector((x, 0.02 * math.sin(1.3 * t), z))


def jig_axis_free(t):
    """頭から尾への向き。巻くと頭が少し上、止めると頭から沈む。小さく左右にゆれる"""
    n, u = phase(t)
    up = Vector((1.0, 0.0, -0.27)).normalized()
    dn = Vector((1.0, 0.0, 0.45)).normalized()
    k = sstep(P_R, P_R + 0.25, u) * (1 - sstep(P - 0.2, P, u))
    a = up.lerp(dn, k)
    w = 0.25 * math.sin(2 * math.pi * 2.4 * t) * (1 - k)
    return Vector((a.x * math.cos(w), a.x * math.sin(w), a.z)).normalized()


def jig_smooth(t):
    acc = Vector((0, 0, 0))
    for i in range(13):
        acc += jig(t - 0.6 + i * 0.1)
    return acc / 13


S0 = Vector((2.4, 0.9, 0.55))


def follow(t):
    """ジグの沖側うしろ（+x）、少し奥。口はジグと同じくらいの高さ"""
    return jig_smooth(t) + Vector((0.42 + 0.05 * math.sin(1.1 * t), 0.07 * math.sin(0.7 * t), -0.02))


def snout_pre(t):
    S = S0.lerp(follow(t), sstep(0.0, 3.2, t))
    return S.lerp(jig(t) + Vector((0.01, 0, 0.0)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)


def snout(t):
    if t < T_BITE:
        p = snout_pre(t)
    else:
        u = t - T_BITE
        # 掛かると首を振りながら、糸に引かれて岸側（-x）へ、少し上へ
        p = SB + Vector((-0.28 * u, 0.05 * math.sin(2 * math.pi * 2.6 * u), 0.30 * u))
    p.z = max(p.z, 0.30)
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
    # 頭の上げ下げは小さく（下端を海底から離すため）
    h = math.hypot(d.x, d.y) or 1.0
    d = Vector((d.x / h, d.y / h, max(-0.18, min(0.18, d.z))))
    u = t - T_BITE
    yaw = 0.4 * math.sin(2 * math.pi * 2.2 * u)
    hk = Vector((-math.cos(yaw), math.sin(yaw), 0.30)).normalized()
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


SCHOOL = []


def school(i, t):
    return None
