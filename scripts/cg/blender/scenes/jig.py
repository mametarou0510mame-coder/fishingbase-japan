# 船の青物ジギング：メタルジグ（160g・約17cm）をワンピッチでしゃくり上げ、長いフォールに入れる。
# ブリ（Fish Kit buri、CC0）が下から1本のなめらかな道すじで近づき、フォールで食う。うしろを群れが横切る。
# 2026-11-12 オーナー：ブリが前後に行ったり来たりする動きはありえない → 道すじは前へ進むだけの曲線にし、
# ジグのしゃくりには付いていかない（カメラもしゃくりの上下をならして追う）。
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

Z0 = 3.0           # しゃくり始めの高さ（底から3m。はじめは海底も見える）
P = 0.78           # ワンピッチ 1 回の長さ（秒）
N_JERK = 6         # しゃくる回数
T_FALL = P * N_JERK          # ここから長いフォール
FALL_V = 0.8                 # フォールの沈む速さ m/s（ひらひら落ちる）
T_BITE = T_FALL + 3.9        # フォールの途中で食う
T_DASH = T_BITE - 0.5
T_THUMB = T_BITE + 0.3
THUMB_K = 1.35       # サムネイルは少し引いて、ブリを右に小さめに（左の文字と重ねない）
THUMB_SHIFT = -0.24


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def jerk_z(t):
    """ワンピッチ：0.4 拍で 0.55m 上がり、残りで 0.17m 落ちる（1回で 0.38m 上がる）"""
    c = t / P
    n = int(math.floor(c))
    u = c - n
    rise = 0.55 * (1 - (1 - min(u / 0.4, 1.0)) ** 2.2)
    fall = 0.17 * sstep(0.42, 1.0, u)
    return Z0 + n * 0.38 + rise - fall, n, u


Z_TOP = Z0 + N_JERK * 0.38


def jig(t):
    """ジグの頭（糸を結ぶ所）の位置"""
    t = max(t, 0.0)   # カメラは少し前の時刻も見るので、0 秒より前は 0 秒と同じ
    if t < T_FALL:
        z, n, u = jerk_z(t)
        side = -1 if n % 2 else 1
        x = 0.05 * side * math.sin(math.pi * min(u / 0.5, 1.0))
        return Vector((x, 0.015 * math.sin(1.7 * t), z))
    u = t - T_FALL
    # フォール：ひらひらと左右にゆれながら沈む（はじめの 0.3 秒で速さが乗る）
    z = Z_TOP - FALL_V * (u - 0.3 * (1 - math.exp(-u / 0.3)))
    k = min(u / 0.6, 1.0)
    return Vector((0.09 * k * math.sin(2 * math.pi * 1.1 * u), 0.05 * k * math.sin(2 * math.pi * 0.8 * u + 0.6), z))


def jig_axis_free(t):
    """頭から尾への向き（しゃくると縦、フォールは横を向いてひらひら）"""
    t = max(t, 0.0)
    if t < T_FALL:
        _, n, u = jerk_z(t)
        tilt = 0.15 + 0.85 * sstep(0.42, 0.6, u) + 0.12 * math.sin(2 * math.pi * 3 * u) * sstep(0.42, 0.6, u)
        az = n * 1.3 + 2 * math.pi * 0.8 * u
    else:
        u = t - T_FALL
        tilt = 0.15 + 1.0 * sstep(0.0, 0.4, u) + 0.22 * math.sin(2 * math.pi * 2.2 * u)
        az = 2 * math.pi * 0.55 * u + 1.0
    return Vector((math.sin(tilt) * math.cos(az), math.sin(tilt) * math.sin(az), -math.cos(tilt)))


def jig_smooth(t):
    """カメラ用：しゃくりの上下をならした位置（1.6 秒の平均）"""
    acc = Vector((0, 0, 0))
    for i in range(17):
        acc += jig(t - 1.6 + i * 0.1)
    return acc / 17


# ブリの道すじ：下・左うしろから、食う点まで、前へ進むだけの3次ベジェ曲線（行ったり来たりしない）
MEET = jig(T_BITE) + Vector((0, 0, -0.02))
B0 = Vector((-2.6, 1.0, 1.0))
B1 = Vector((-1.9, 0.75, 1.5))
B2 = MEET + Vector((-0.5, 0.12, -0.6))   # 最後は斜め下から突き上げる
B3 = MEET


def bez(u):
    a = 1 - u
    return B0 * (a * a * a) + B1 * (3 * a * a * u) + B2 * (3 * a * u * u) + B3 * (u * u * u)


def bez_d(u):
    a = 1 - u
    return (B1 - B0) * (3 * a * a) + (B2 - B1) * (6 * a * u) + (B3 - B2) * (3 * u * u)


def path_u(t):
    """道すじの進み具合：ゆっくり近づき、最後の 0.5 秒で一気に（だんだん速く。止まったり戻ったりしない）"""
    x = min(max(t / T_BITE, 0.0), 1.0)
    return 0.3 * x + 0.7 * x ** 3.5


def snout_pre(t):
    return bez(path_u(t))


SB = MEET


def snout(t):
    if t < T_BITE:
        return snout_pre(t)
    u = t - T_BITE
    # 掛かると横へ走る（青物の走り）。首を振る
    return SB + Vector((0.85 * u, 0.25 * math.sin(1.1 * u) * u + 0.04 * math.sin(2 * math.pi * 3 * u), -0.12 * u))


def heading(t):
    if t < T_BITE:
        d = bez_d(max(path_u(t), 0.02)).normalized()
        to = jig(t) - snout(t)
        if to.length > 1e-4:
            d = d.lerp(to.normalized(), 0.3 * sstep(T_DASH - 0.6, T_DASH, t)).normalized()
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
            return 1.5 + 0.6 * sstep(0, T_DASH, x)
        if x < T_BITE:
            return 4.5
        return 3.5
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.07 + 0.05 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def sep(t):
    real = min((lure_now(t) - snout(t)).length, 2.4)
    return 1.0 + (real - 1.0) * sstep(0.5, 2.5, t)


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.3
        k = sstep(0.5, 3.0, x)   # はじめはジグ中心、ブリが寄ると両方を入れる
        return jig_smooth(x).lerp(jig_smooth(x) * 0.4 + body * 0.6, k) + Vector((0, 0, 0.03)) if x < T_BITE else lure_now(x) * 0.4 + body * 0.6
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


def focus(t):
    k = sstep(0.5, 3.0, t)
    return jig(t).lerp(snout(t), k)


# うしろを横切る群れ（ヒーローとジグからは離す：y は 1.8m 以上うしろ）
SCHOOL = [
    # (x0, y0, z0, 長さ, 位相)
    (-6.0, 2.2, 2.0, 0.70, 0.0),
    (-6.8, 2.9, 2.8, 0.78, 1.3),
    (-5.2, 3.6, 2.3, 0.66, 2.1),
    (-7.6, 2.5, 3.5, 0.74, 0.7),
    (-4.6, 4.3, 3.2, 0.80, 2.9),
    (-8.4, 3.3, 4.2, 0.72, 1.9),
]


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 1.0 * t, y0 + 0.1 * math.sin(0.5 * t + ph), z0 + 0.15 * math.sin(0.8 * t + ph)))
    d = Vector((1.0, 0.05 * math.cos(0.5 * t + ph), 0.12 * math.cos(0.8 * t + ph))).normalized()
    return p, d, (1.7 * t + ph, 0.07), ln
