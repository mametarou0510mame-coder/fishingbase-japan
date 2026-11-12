# タイラバとマダイ（Fish Kit madai、CC0）。等速巻きを追って、最後に食う。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。
import math
from mathutils import Vector

FISH = "madai"
FISH_LEN = None     # モデルのまま（45cm）
LURE = "tairaba"
SEC = 10.0
T_THUMB = 8.6
CAM_OFF = (0.30, -1.6, -0.30)
LENS = 40
SCHOOL = []


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


RISE = 0.55        # 等速巻きの上がる速さ m/s
T_DASH, T_BITE = 7.9, 8.3
LEN = 0.451        # マダイの長さ（モデルのまま 45cm）


def lure(t):
    """タイラバの頭の位置。着底 → 0.4 秒で巻き始め（タッチ＆ゴー）→ 等速で上がる"""
    z = 0.045 + RISE * max(t - 0.4, 0.0)
    return Vector((0.012 * math.sin(2.1 * t), 0.010 * math.sin(1.3 * t + 1.0), z))


def follow(t):
    """追う位置（口の先）：タイラバの少し後ろ下。ゆっくり左右に揺れる。海底近くでは下げすぎない"""
    f = lure(t) + Vector((-0.30 + 0.04 * math.sin(1.7 * t), 0.10 * math.sin(0.8 * t), -0.20 + 0.03 * math.sin(1.1 * t)))
    f.z = max(f.z, 0.42)
    return f


S0 = Vector((-1.7, 1.0, 0.45))


def snout_pre(t):
    if t < 3.4:
        return S0.lerp(follow(t), sstep(0.0, 3.4, t))
    if t < T_DASH:
        return follow(t)
    # 食いつく：スカートの下へ一気に寄る
    return follow(t).lerp(lure(t) + Vector((0, 0, -0.03)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)


def snout(t):
    if t < T_BITE:
        return snout_pre(t)
    u = t - T_BITE
    # 掛かった後：糸に引かれて上がりながら、首を振る
    return SB + Vector((0.03 * math.sin(2 * math.pi * 2.6 * u), 0.04 * math.sin(2 * math.pi * 1.9 * u + 0.6), 0.30 * u))


def lure_now(t):
    return lure(t) if t < T_BITE else snout(t)


def heading(t):
    S = snout(t)
    if t < T_BITE:
        v = (snout(t + 0.05) - snout(t - 0.05))
        v = v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))
        to = lure(t) - S
        to = to.normalized() if to.length > 1e-4 else v
        d = v.lerp(to, sstep(1.6, 3.4, t)).normalized()
    else:
        d = Vector((1, 0, 0))
    u = t - T_BITE
    hk = Vector((0.75 * math.cos(0.5 * math.sin(2 * math.pi * 1.3 * u)), 0.75 * math.sin(0.5 * math.sin(2 * math.pi * 1.3 * u)), 0.62)).normalized()
    k = sstep(T_BITE - 0.05, T_BITE + 0.35, t)
    return d.lerp(hk, k).normalized()


def swim(t):
    """尾を振る位相（回）と振れ幅。追う 2Hz、突っ込む 5Hz、掛かると 4Hz で大きく"""
    def freq(x):
        if x < T_DASH:
            return 2.1
        if x < T_BITE:
            return 5.0
        return 4.0
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.06 + 0.06 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.2   # 魚の体の真ん中
        return lure_now(x) * 0.4 + body * 0.6 + Vector((0, 0, 0.03))
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9




def sep(t):
    return (lure_now(t) - snout(t)).length


def lure_axis(t):
    return None


def focus(t):
    return snout(t)


def school(i, t):
    return None
