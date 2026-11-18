# テトラ帯：テトラ（消波ブロック）の山のすそ（際）。カサゴ（Fish Kit kasago、CC0）がテトラのすき間の前にひそみ、
# 右（沖の砂地）からワーム（ジグヘッド＋ワーム）がリフト＆フォールで近づく。隠れ家のすぐ外まで来たとき、飛び出して食う。
# 釣り方：シマノ「ロックフィッシュとは?」（底まで沈めてリフト&フォール・掛かると岩穴に逃げ込む）、BE-PAL（根魚は隠れて近くを通る小魚をねらう）。
# 魚の動きはイメージ。動きは時刻 t（秒）だけで決まる。opening.py から読む。砂の底は z=0（単位 m）。
# 確かめ：python3 scripts/cg/blender/check_scene.py tetra（魚の下端は砂から 0.2m 以上、テトラの表面から離れていること）
import math
from mathutils import Vector

FISH = "kasago"
FISH_LEN = 0.28
LURE = "jig"
JIG_MAT = "worm"        # opening.py：ジグの代わりにワーム（オレンジの胴＋鉛の頭）
JIG_LEN = 0.075
JIG_W = 0.5
ENV = "tetra"           # parts.build_tetra
SEC = 11.0              # 冒頭の章（約9〜10秒）より少し長く
CAM_OFF = (0.45, -1.75, 0.14)
LENS = 32
CAM_KMAX = 2.0
LINE_DIR = (-0.75, 0.0, 0.66)   # 糸は左上（防波堤の上の竿先）へ。テトラの山の上を通る

# テトラ：(x, y, z, rx, ry, rz, 大きさ)。左に山、右は砂地。カメラ（手前 -y）と魚のあいだには置かない
S_T = 0.6
TETRA = [
    (-1.30, 0.95, 0.50, 0.30, 0.70, 0.20, S_T), (-1.70, 2.70, 0.55, 1.10, 0.20, 0.90, S_T), (-2.05, -0.95, 0.50, 0.60, 1.30, 0.40, S_T),
    (-2.45, 0.55, 1.40, 0.90, 0.50, 1.70, S_T), (-2.95, 2.10, 1.50, 0.20, 1.00, 0.60, S_T), (-3.60, -0.60, 1.30, 1.40, 0.30, 0.20, S_T),
    (-3.70, 1.25, 2.40, 0.50, 0.80, 1.20, S_T), (-4.60, 0.00, 2.30, 1.00, 1.40, 0.70, S_T), (-0.90, 4.20, 0.50, 0.70, 0.90, 1.30, S_T),
]

# ワームのリフト＆フォール：1回 P 秒（上げる LIFT 秒 → 落とす FALL 秒 → 止める）
P, LIFT, FALL = 1.6, 0.55, 0.80
X0, DX_UP, DX_DN = 1.95, 0.22, 0.10
Z_LO, Z_HI = 0.05, 0.45
T_BITE = 5 * P + 0.50   # 6回目に上げたいちばん上で食う
T_DASH = T_BITE - 0.45
T_THUMB = T_BITE - 0.08
THUMB_K = 1.1
THUMB_SHIFT = -0.22
H0 = Vector((-0.22, 0.15, 0.32))   # カサゴが待つ所（口先）：テトラのすそ、すき間の前


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def phase(t):
    t = max(t, 0.0)
    n = int(math.floor(t / P))
    return n, t - n * P


def worm(t):
    n, u = phase(t)
    x = X0 - n * (DX_UP + DX_DN) - DX_UP * sstep(0, LIFT, u) - DX_DN * sstep(LIFT, LIFT + FALL, u)
    z = Z_LO + (Z_HI - Z_LO) * (sstep(0, LIFT, u) - sstep(LIFT, LIFT + FALL, u))
    return Vector((x, 0.02 * math.sin(0.9 * t), z))


def worm_axis_free(t):
    """頭から尾への向き。上げると頭が上（尾が下）、落とすと頭から沈む"""
    n, u = phase(t)
    up = Vector((1.0, 0.0, -0.35)).normalized()
    dn = Vector((1.0, 0.0, 0.6)).normalized()
    flat = Vector((1.0, 0.0, 0.05)).normalized()
    if u < LIFT:
        return flat.lerp(up, sstep(0, 0.2, u)).normalized()
    if u < LIFT + FALL:
        return up.lerp(dn, sstep(LIFT, LIFT + 0.25, u)).normalized()
    return dn.lerp(flat, sstep(LIFT + FALL, P, u)).normalized()


def snout_pre(t):
    sway = Vector((0.015 * math.sin(0.7 * t), 0.01 * math.sin(0.5 * t), 0.012 * math.sin(0.9 * t)))
    h = H0 + sway
    return h.lerp(worm(t) + Vector((0.012, 0.0, -0.004)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)


def snout(t):
    if t < T_BITE:
        p = snout_pre(t)
    else:
        u = t - T_BITE
        # 掛かると首を振りながら、糸に引かれて左上（竿の方）へ。下（テトラのすき間の方）へもぐろうとして少し沈む
        p = SB + Vector((-0.18 * u, 0.04 * math.sin(2 * math.pi * 2.4 * u), 0.10 * u - 0.10 * sstep(0, 0.5, u)))
    p.z = max(p.z, 0.32)
    return p


def heading(t):
    base = Vector((1.0, 0.0, 0.05)).normalized()   # 沖（右）を向いて待つ
    if t < T_DASH:
        d = base
    elif t < T_BITE:
        to = worm(t) - snout(t)
        d = base.lerp(to.normalized(), sstep(T_DASH, T_BITE - 0.15, t)) if to.length > 1e-4 else base
    else:
        # 掛かると向きを変えて、テトラのすき間（左）へ逃げ込もうとする。首を振る
        u = t - T_BITE
        a = math.pi * sstep(0.0, 0.5, u) + 0.4 * math.sin(2 * math.pi * 2.0 * u) * sstep(0.3, 0.6, u)
        d = Vector((math.cos(a), math.sin(a), -0.12))
    h = math.hypot(d.x, d.y) or 1.0
    return Vector((d.x / h, d.y / h, max(-0.15, min(0.15, d.z)))).normalized()


def lure_now(t):
    if t < T_BITE:
        return worm(t)
    return snout(t) + heading(t) * 0.008


def lure_axis(t):
    if t < T_BITE:
        return worm_axis_free(t)
    a = (heading(t) * 0.7 + Vector((0, 0, -0.5))).normalized()   # 口から尾が垂れる（頭は口の中）
    return worm_axis_free(T_BITE).lerp(a, sstep(T_BITE, T_BITE + 0.3, t)).normalized()


def swim(t):
    def freq(x):
        if x < T_DASH:
            return 0.9
        if x < T_BITE:
            return 5.0
        return 4.2
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.035 + 0.07 * sstep(T_DASH - 0.1, T_DASH, t) + 0.02 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def sep(t):
    real = min((lure_now(t) - snout(t)).length, 3.0)
    return 0.7 + (real - 0.7) * sstep(0.3, 2.0, t)


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.12
        return worm(x) * 0.5 + body * 0.5 + Vector((0, 0, 0.05)) if x < T_BITE else lure_now(x) * 0.4 + body * 0.6 + Vector((0, 0, 0.05))
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


def focus(t):
    return snout(t).lerp(worm(t), 0.35 * (1 - sstep(T_DASH, T_BITE, t)))


# うしろのすき間にもう1匹（同じカサゴ）：(口先 x, y, z, 体長, 位相)
SCHOOL = [(-0.62, 2.05, 0.34, 0.24, 0.7)]


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 0.02 * math.sin(0.5 * t + ph), y0, z0 + 0.01 * math.sin(0.8 * t + ph)))
    d = Vector((1.0, -0.35, 0.03)).normalized()
    return p, d, (0.8 * t + ph, 0.03), ln
