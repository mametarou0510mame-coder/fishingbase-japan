# 見える化「魚からはどこまで見えている？」（cg-shikai）の冒頭：海底の少し上で止まっているマダイ（Fish Kit madai、CC0）の前を、
# タイラバが上から落ちてくる。マダイは頭を下げて目で追い（前の下を見る）、着底のあと巻き上げが始まると後ろ下から追って、最後に食う。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "madai"
FISH_LEN = None     # モデルのまま（45cm）
LURE = "tairaba"
SEC = 11.0          # 冒頭の章（見積もり約7.5秒 → 本番は約1.3倍）より長く
T_THUMB = 9.3       # 巻き上がるタイラバのすぐ後ろ下を追う瞬間
CAM_OFF = (0.4, -1.75, -0.12)
LENS = 40
CAM_KMAX = 2.0
THUMB_SHIFT = -0.2
THUMB_K = 1.0
SCHOOL = []


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


FALL0, FALL_V = 1.65, 0.42          # 落ち始めの高さ・落ちる速さ m/s
T_LAND = (FALL0 - 0.045) / FALL_V   # 約3.8秒で着底
T_GO = T_LAND + 0.7                 # 少し置いてから巻き始め
RISE = 0.38                         # 巻き上げの速さ m/s
T_DASH, T_BITE = 9.55, 9.95
LX = 0.05                           # タイラバが落ちる場所（マダイの口の前 約0.5m）


def lure(t):
    if t < T_LAND:
        z = FALL0 - FALL_V * max(t, 0.0)
    elif t < T_GO:
        z = 0.045
    else:
        z = 0.045 + RISE * (t - T_GO)
    return Vector((LX + 0.012 * math.sin(2.1 * t), 0.010 * math.sin(1.3 * t + 1.0), z))


def hover(t):
    """止まっているマダイの口先（少しゆれる）"""
    return Vector((-0.48 + 0.025 * math.sin(0.8 * t), 0.02 * math.sin(0.5 * t + 0.3), 0.78 + 0.025 * math.sin(0.9 * t)))


def follow(t):
    """追う位置（口の先）：タイラバの少し後ろ下"""
    f = lure(t) + Vector((-0.30 + 0.04 * math.sin(1.7 * t), 0.08 * math.sin(0.8 * t), -0.20 + 0.03 * math.sin(1.1 * t)))
    f.z = max(f.z, 0.5)
    return f


def snout_pre(t):
    if t < T_DASH:
        return hover(t).lerp(follow(t), sstep(T_GO + 0.3, T_GO + 2.4, t))
    return follow(t).lerp(lure(t) + Vector((0, 0, -0.03)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)


def snout(t):
    if t < T_BITE:
        return snout_pre(t)
    u = t - T_BITE
    return SB + Vector((0.03 * math.sin(2 * math.pi * 2.6 * u), 0.04 * math.sin(2 * math.pi * 1.9 * u + 0.6), 0.30 * u))


def lure_now(t):
    if t < T_BITE:
        return lure(t)
    k = sstep(T_BITE, T_BITE + 0.25, t)
    return snout(t).lerp(snout(t) + Vector((0, 0, 0.045)) + heading(t) * 0.006, k)


def heading(t):
    S = snout(t)
    if t < T_BITE:
        to = lure(t) - S
        to = to.normalized() if to.length > 1e-4 else Vector((1, 0, 0))
        # 止まっている間は、頭を少しタイラバへ向ける（前の下を見る）。追うときはタイラバへ
        w = 0.5 + 0.4 * sstep(T_GO, T_GO + 2.0, t)
        d = Vector((1, 0, 0)).lerp(to, w).normalized()
        # 頭の下げすぎ・上げすぎを抑える（約35°まで）
        if abs(d.z) > 0.57:
            hz = math.copysign(0.57, d.z)
            hxy = math.sqrt(1 - hz * hz) / max(math.hypot(d.x, d.y), 1e-6)
            d = Vector((d.x * hxy, d.y * hxy, hz))
    else:
        d = Vector((1, 0, 0))
    u = t - T_BITE
    yaw = 0.45 * math.sin(2 * math.pi * 2.2 * u)
    hk = Vector((0.9 * math.cos(yaw), 0.9 * math.sin(yaw), 0.45)).normalized()
    k = sstep(T_BITE - 0.05, T_BITE + 0.35, t)
    return d.lerp(hk, k).normalized()


def swim(t):
    """尾を振る位相（回）と振れ幅。止まる 1.2Hz、追う 2Hz、突っ込む 5Hz、掛かると 4Hz"""
    def freq(x):
        if x < T_GO:
            return 1.2
        if x < T_DASH:
            return 2.0
        if x < T_BITE:
            return 5.0
        return 4.0
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.04 + 0.02 * sstep(T_GO, T_GO + 1, t) + 0.06 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.2
        return lure_now(x) * 0.5 + body * 0.5 + Vector((0, 0, 0.03))
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
