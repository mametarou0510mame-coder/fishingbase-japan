# アカデミー R10「海の中で赤は消える？」（cg-akai）の冒頭：赤いマダイ（Fish Kit madai、CC0）が、ゆっくり巻かれる赤いタイラバの
# そばをゆったり泳ぐ（食わない）。うしろの遠くを別のマダイが横切る。遠くの魚ほど水の吸収で赤が抜けて青っぽく見える（水の材質は opening.py のまま）。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "madai"
FISH_LEN = None     # モデルのまま（45cm）
LURE = "tairaba"
SEC = 11.0          # 冒頭の章（約9.9秒）より少し長く
T_THUMB = 6.8
CAM_OFF = (0.25, -1.55, -0.22)
LENS = 40
CAM_KMAX = 1.9
T_BITE = 99.0       # 食わない（掛かった後の動きは使わない）
THUMB_SHIFT = -0.2

# 遠くのマダイ（x0, y0, z0, 長さ, 位相）。カメラ（-y 側）から 3〜6m 奥
SCHOOL = [(2.6, 3.2, 1.3, 0.42, 0.0), (3.6, 4.4, 1.8, 0.46, 1.7), (1.4, 5.3, 1.1, 0.44, 3.1), (4.8, 6.0, 2.3, 0.45, 4.4)]


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def lure(t):
    """タイラバの頭：ゆっくり等速で巻かれて上がる（0.045 m/s）。少しゆれる"""
    t = max(t, -1.0)
    return Vector((0.35 + 0.012 * math.sin(1.9 * t), 0.06 + 0.010 * math.sin(1.3 * t + 1.0), 0.72 + 0.045 * t))


def snout(t):
    """マダイの口先：左から右へゆったり。タイラバの少し手前・下を通り、後半はタイラバを見上げるように寄る"""
    x = -1.05 + 0.13 * t + 0.03 * math.sin(0.7 * t)
    y = -0.05 + 0.05 * math.sin(0.45 * t + 0.4)
    z = 0.78 + 0.05 * math.sin(0.6 * t) + 0.12 * sstep(4.0, 9.0, t)
    return Vector((x, y, z))


def heading(t):
    v = snout(t + 0.05) - snout(t - 0.05)
    v = v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))
    # 頭を少しタイラバへ向ける
    to = lure(t) - snout(t)
    to = to.normalized() if to.length > 1e-4 else v
    return v.lerp(to, 0.15 * sstep(3.0, 7.0, t)).normalized()


def swim(t):
    """尾を振る位相（回）と振れ幅。ゆったり 1.6Hz"""
    return 1.6 * t, 0.06


def lure_now(t):
    return lure(t)


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.2
        return lure(x) * 0.35 + body * 0.65 + Vector((0, 0, 0.02))
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


def sep(t):
    return (lure(t) - snout(t)).length


def lure_axis(t):
    return None


def focus(t):
    return snout(t)


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 - 0.35 * t, y0 + 0.1 * math.sin(0.4 * t + ph), z0 + 0.1 * math.sin(0.6 * t + ph)))
    d = Vector((-1.0, 0.05 * math.cos(0.4 * t + ph), 0.06 * math.cos(0.6 * t + ph))).normalized()
    return p, d, (1.5 * t + ph, 0.06), ln
