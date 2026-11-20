# 漁港のスロープ：坂（斜路）の終わりの段差と、そのすそに入った捨て石。カサゴ（Fish Kit kasago、CC0）が捨て石の前で待ち、
# 右（沖の深い所）からワーム（ジグヘッド＋ワーム）がリフト＆フォールで近づく。段差のすぐ前まで来たとき、飛び出して食う。
# 釣り方：TSURI HACK「漁港の釣りはココが狙い目」（切れ目に捨て石・深場が隠れ家で浅場が餌場・ブレイクまで投げてリフト&フォール）。
# 魚の動きはイメージ。地形は模式図。動きは時刻 t（秒）だけで決まる。opening.py から読む。砂の底は z=0（単位 m）。
# 確かめ：python3 scripts/cg/blender/check_scene.py slope（魚の下端は砂・石から 0.2m 以上）
import math
from mathutils import Vector

FISH = "kasago"
FISH_LEN = 0.28
LURE = "jig"
JIG_MAT = "worm"        # opening.py：ジグの代わりにワーム（オレンジの胴＋鉛の頭）
JIG_LEN = 0.09
JIG_W = 0.65
ENV = "reef"            # parts.build_reef：坂の終わりの段差と捨て石を高さの式 reef_h で作る
SEC = 11.0              # 冒頭の章（約9〜10秒）より少し長く
CAM_OFF = (0.40, -1.70, 0.32)
LENS = 32
CAM_KMAX = 1.7
LINE_DIR = (-0.75, 0.0, 0.66)   # 糸は左上（岸壁の上の竿先）へ。坂の上を通る

# 捨て石：(x, y, 半径, 高さ)
STONES = [(-0.75, -0.6, 0.30, 0.42), (-0.62, 0.35, 0.34, 0.50), (-0.80, 1.30, 0.32, 0.46), (-0.95, 2.3, 0.36, 0.52),
          (-1.10, -1.5, 0.30, 0.40), (-0.55, 3.2, 0.30, 0.42), (-1.25, 0.9, 0.30, 0.45)]


def reef_h(x, y):
    """砂の底からの高さ。左は坂の終わり（段差 約0.9m、その上は坂が左へ上がる）、すそに捨て石"""
    def sst(a, b, v):
        v = min(max((v - a) / (b - a), 0.0), 1.0)
        return v * v * (3 - 2 * v)
    step = sst(-1.25, -1.45, x) * (0.9 + 0.22 * max(0.0, -1.45 - x))
    st = 0.0
    for sx, sy, r, h in STONES:
        d2 = ((x - sx) ** 2 + (y - sy) ** 2) / (r * r)
        if d2 < 1.0:
            st = max(st, h * math.sqrt(1.0 - d2))
    rough = 0.03 * math.sin(5.1 * x + 1.7 * y) * math.sin(4.3 * y - 0.9 * x)
    return max(0.0, max(step, st) + rough * min(max(step, st) / 0.2, 1.0))


def kelp_keep_out(x, y):
    """海藻は坂の上（段差より左）だけ。魚と仕掛けの通り道にはおかない"""
    return x > -1.5 or y < -0.8


# ワームのリフト＆フォール：1回 P 秒（上げる LIFT 秒 → 落とす FALL 秒 → 止める）
P, LIFT, FALL = 1.6, 0.55, 0.80
X0, DX_UP, DX_DN = 1.95, 0.22, 0.10
Z_LO, Z_HI = 0.05, 0.45
T_BITE = 5 * P + 0.50   # 6回目に上げたいちばん上で食う
T_DASH = T_BITE - 0.45
T_THUMB = T_BITE - 0.08
THUMB_K = 0.75
THUMB_SHIFT = -0.22
H0 = Vector((0.05, 0.15, 0.32))   # カサゴが待つ所（口先）：捨て石の前


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
        # 掛かると首を振りながら、糸に引かれて左上（竿の方）へ。下（捨て石の方）へもぐろうとして少し沈む
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
        # 掛かると向きを変えて、捨て石のすき間（左）へ逃げ込もうとする。首を振る
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
        return worm(x) * 0.5 + body * 0.5 + Vector((0, 0, 0.12)) if x < T_BITE else lure_now(x) * 0.4 + body * 0.6 + Vector((0, 0, 0.12))
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


def focus(t):
    return snout(t).lerp(worm(t), 0.35 * (1 - sstep(T_DASH, T_BITE, t)))


# うしろの石の前にもう1匹（同じカサゴ）：(口先 x, y, z, 体長, 位相)
SCHOOL = [(-0.05, 2.0, 0.34, 0.24, 0.7)]


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 0.02 * math.sin(0.5 * t + ph), y0, z0 + 0.01 * math.sin(0.8 * t + ph)))
    d = Vector((1.0, -0.35, 0.03)).normalized()
    return p, d, (0.8 * t + ph, 0.03), ln
