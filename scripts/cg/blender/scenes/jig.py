# 船の青物ジギング：メタルジグ（160g・約17cm）がフォールで着底 → ワンピッチでしゃくり上げる。
# ブリ（Fish Kit buri、CC0）が下から追い、フォールで食う。うしろを群れが横切る。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "buri"
FISH_LEN = 0.75
LURE = "jig"
SEC = 13.0   # 冒頭の章（約12秒）より少し長く
CAM_OFF = (0.35, -1.9, -0.30)
LENS = 40
JIG_LEN = 0.17

T_FALL_END = 1.3   # フォールして着底
T_JERK = 1.55      # 着底からすぐしゃくり始める
P = 0.78           # ワンピッチ 1 回の長さ（秒）
T_BITE = T_JERK + P * 9.6   # 10 回目のフォール中に食う
T_DASH = T_BITE - 0.35
T_THUMB = T_BITE + 0.3


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def cyc_of(t):
    c = (t - T_JERK) / P
    n = int(math.floor(c))
    return n, c - n


def jig(t):
    """ジグの頭（糸を結ぶ所）の位置"""
    t = max(t, 0.0)   # カメラは少し前の時刻も見るので、0 秒より前は 0 秒と同じ
    if t < T_FALL_END:
        k = t / T_FALL_END
        z = 3.2 - 3.08 * k ** 1.25
        x = 0.10 * math.sin(2 * math.pi * 1.4 * t) * (1 - k)
        y = 0.05 * math.sin(2 * math.pi * 1.1 * t + 0.7) * (1 - k)
        return Vector((x, y, z))
    if t < T_JERK:
        return Vector((0.0, 0.0, 0.12))
    n, u = cyc_of(t)
    rise = 0.55 * (1 - (1 - min(u / 0.4, 1.0)) ** 2.2)
    fall = 0.17 * sstep(0.42, 1.0, u)
    z = 0.12 + n * 0.38 + rise - fall
    side = -1 if n % 2 else 1
    x = 0.05 * side * math.sin(math.pi * min(u / 0.5, 1.0))
    return Vector((x, 0.015 * math.sin(1.7 * t), z))


def jig_axis_free(t):
    """頭から尾への向き（フォールは横を向いてひらひら、しゃくると縦）"""
    if t < T_FALL_END:
        tilt = 1.0 + 0.25 * math.sin(2 * math.pi * 2.2 * t)
        az = 2 * math.pi * 0.9 * t
    elif t < T_JERK:
        tilt, az = 1.45, 0.3
    else:
        n, u = cyc_of(t)
        tilt = 0.15 + 0.95 * sstep(0.42, 0.6, u) + 0.15 * math.sin(2 * math.pi * 3 * u) * sstep(0.42, 0.6, u)
        az = n * 1.3 + 2 * math.pi * 0.8 * u
    return Vector((math.sin(tilt) * math.cos(az), math.sin(tilt) * math.sin(az), -math.cos(tilt)))


def follow(t):
    f = jig(t) + Vector((-0.55 + 0.06 * math.sin(1.3 * t), 0.18 * math.sin(0.7 * t), -0.45 + 0.05 * math.sin(0.9 * t)))
    f.z = max(f.z, 0.9)
    return f


S0 = Vector((-2.6, 0.9, 1.0))


def snout_pre(t):
    if t < 1.5:
        return S0 + Vector((0.4 * (t - 1.5), 0, 0))
    if t < 4.5:
        return S0.lerp(follow(t), sstep(1.5, 4.5, t))
    if t < T_DASH:
        return follow(t)
    return follow(t).lerp(jig(t) + Vector((0, 0, -0.02)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)


def snout(t):
    if t < T_BITE:
        return snout_pre(t)
    u = t - T_BITE
    # 掛かると横へ走る（青物の走り）。首を振る
    return SB + Vector((0.85 * u, 0.25 * math.sin(1.1 * u) * u + 0.04 * math.sin(2 * math.pi * 3 * u), -0.12 * u))


def heading(t):
    S = snout(t)
    if t < T_BITE:
        v = snout(t + 0.05) - snout(t - 0.05)
        v = v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))
        to = jig(t) - S
        to = to.normalized() if to.length > 1e-4 else v
        d = v.lerp(to, sstep(2.5, 4.5, t)).normalized()
    else:
        d = Vector((1, 0, 0))
    u = t - T_BITE
    yaw = 0.35 * math.sin(2 * math.pi * 1.5 * u)
    hk = Vector((math.cos(yaw), math.sin(yaw), -0.15)).normalized()
    return d.lerp(hk, sstep(T_BITE - 0.05, T_BITE + 0.35, t)).normalized()


def lure_now(t):
    if t < T_BITE:
        return jig(t)
    d = heading(t)
    return snout(t) + d * 0.02 + Vector((0, 0, 0.03))


def lure_axis(t):
    if t < T_BITE:
        return jig_axis_free(t)
    a = (-heading(t) * 0.7 + Vector((0, 0, -0.7))).normalized()
    return jig_axis_free(T_BITE).lerp(a, sstep(T_BITE, T_BITE + 0.3, t)).normalized()


def swim(t):
    def freq(x):
        if x < T_DASH:
            return 1.6
        if x < T_BITE:
            return 4.5
        return 3.5
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.07 + 0.05 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def sep(t):
    real = min((lure_now(t) - snout(t)).length, 2.4)
    return 1.0 + (real - 1.0) * sstep(1.0, 3.0, t)


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.3
        k = sstep(1.0, 3.5, x)   # はじめはジグだけ、魚が寄ると魚も入れる
        return jig(x).lerp(lure_now(x) * 0.4 + body * 0.6, k) + Vector((0, 0, 0.03))
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


def focus(t):
    k = sstep(1.0, 3.5, t)
    return jig(t).lerp(snout(t), k)


# うしろを横切る群れ（ヒーローとジグからは離す：y は 1.8m 以上うしろ）
SCHOOL = [
    # (x0, y0, z0, 長さ, 位相)
    (-6.0, 2.2, 1.6, 0.70, 0.0),
    (-6.8, 2.9, 2.4, 0.78, 1.3),
    (-5.2, 3.6, 1.9, 0.66, 2.1),
    (-7.6, 2.5, 3.1, 0.74, 0.7),
    (-4.6, 4.3, 2.8, 0.80, 2.9),
    (-8.4, 3.3, 3.8, 0.72, 1.9),
]


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 1.0 * t, y0 + 0.1 * math.sin(0.5 * t + ph), z0 + 0.15 * math.sin(0.8 * t + ph)))
    d = Vector((1.0, 0.05 * math.cos(0.5 * t + ph), 0.12 * math.cos(0.8 * t + ph))).normalized()
    return p, d, (1.7 * t + ph, 0.07), ln
