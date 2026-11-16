# 船のメバル：根（岩礁）の上で、サビキ仕掛けをゆっくり上げる。メバル（Fish Kit mebaru、CC0）の群れが根の上に浮いていて、
# 1匹がハリのそばへ寄り、最後に食う。合わせずにそのまま上がる（向こう合わせ）。
# 釣り方：TSURI HACK「船メバルサビキ」（すべての動作をゆっくり・アタリは上げている時・アワセ不要）、ダイワ（根周り・岩礁帯の上・海草周辺、群れで数m上まで）。
# 魚の動きはイメージ。動きは時刻 t（秒）だけで決まる。opening.py から読む。砂の底は z=0（単位 m）。
# 魚の下端は根から 0.2m 以上（python3 scripts/cg/blender/check_scene.py mebaru で確かめる）
import math
from mathutils import Vector

FISH = "mebaru"
FISH_LEN = 0.26
LURE = "sabiki"       # opening.py が parts.Sabiki を使う
ENV = "reef"          # 根と海藻（parts.build_reef・parts.Kelp）
SEC = 10.0            # 冒頭の章（約9秒）より少し長く
CAM_OFF = (0.25, -1.75, 0.10)
LENS = 45
CAM_KMAX = 2.0
N_HOOK = 5
SAB_POS = [0.6, 1.05, 1.5, 1.95, 2.4]   # オモリから各ハリの枝まで [m]
BR = 0.14                               # 枝（ハリス）の長さ
RISE = 0.07                             # ゆっくり上げる速さ m/s
T_DASH, T_BITE = 7.0, 7.6
T_THUMB = T_BITE - 0.06
THUMB_K = 1.15
THUMB_SHIFT = -0.2
# うしろの群れ：(x, y, z, 体長, 位相)
SCHOOL = [(1.5, 0.9, 1.9, 0.24, 0.3), (2.1, 1.5, 2.4, 0.22, 1.1), (1.0, 1.8, 2.2, 0.25, 2.0), (-0.9, 1.6, 2.0, 0.23, 2.9),
          (2.6, 0.6, 2.9, 0.21, 3.7), (-1.6, 2.3, 2.6, 0.24, 4.4), (0.6, 2.6, 3.1, 0.22, 5.2), (3.1, 2.2, 3.4, 0.23, 0.8)]


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def reef_h(x, y):
    """根の高さ（砂の底から m）。手前（カメラ側 y<0）は低く、奥に高い岩がある"""
    def g(cx, cy, wx, wy, h):
        return h * math.exp(-((x - cx) / wx) ** 2 - ((y - cy) / wy) ** 2)
    b = g(0.2, 0.9, 2.6, 1.5, 1.05) + g(2.8, 3.4, 1.6, 1.6, 2.5) + g(-2.6, 2.8, 1.5, 1.4, 1.9) + g(-0.3, 5.5, 3.5, 2.0, 1.6) + g(4.5, 1.2, 1.5, 1.2, 0.9) + g(-4.6, 0.8, 1.6, 1.2, 0.8)
    rough = 0.10 * math.sin(3.1 * x + 1.3 * y) * math.sin(2.3 * y - 0.7 * x + 1.0) + 0.05 * math.sin(7.3 * x + 2.0) * math.sin(6.1 * y + x)
    return max(0.0, b + rough * min(b / 0.4, 1.0))


def kelp_keep_out(x, y):
    """海藻を生やさない所：仕掛けと主役の通り道、群れの魚のまわり"""
    if abs(x) < 1.9 and y < 1.5:
        return True
    return any((x - sx) ** 2 + (y - sy) ** 2 < 0.45 ** 2 for sx, sy, *_ in SCHOOL)


def sink(t):
    """オモリの上の端。根の少し上から、ゆっくり上がる"""
    return Vector((0.0, 0.0, 0.98 + RISE * t))


def knot(j, t):
    return sink(t) + Vector((0.0, 0.0, SAB_POS[j]))


def free_end(j, t):
    """ハリスの先（ハリ）。潮（+x）になびいて、ふわふわ揺れる"""
    d = Vector((0.85, 0.10 * math.sin(1.3 * t + 1.7 * j), -0.30 + 0.14 * math.sin(1.7 * t + 2.3 * j))).normalized()
    return knot(j, t) + d * BR


def home(t):
    """待つ位置（口の先）：いちばん下のハリの少し下流。ゆっくり揺れる"""
    return free_end(0, t) + Vector((0.62 + 0.04 * math.sin(0.9 * t), -0.05 + 0.05 * math.sin(0.7 * t), -0.14 + 0.03 * math.sin(1.3 * t)))


S0 = Vector((2.3, 0.9, 1.6))


def snout_pre(t):
    if t < 3.0:
        return S0.lerp(home(t), sstep(0.0, 3.0, t))
    if t < T_DASH:
        return home(t)
    return home(t).lerp(free_end(0, t) + Vector((0.012, 0.0, -0.004)), sstep(T_DASH, T_BITE, t))


def hooked_pos(t):
    """掛かったあと：ハリスが下へ引かれ、口は結び目の真下あたり。首を振る"""
    u = t - T_BITE
    return knot(0, t) + Vector((0.03 * math.sin(2 * math.pi * 2.6 * u), 0.03 * math.sin(2 * math.pi * 1.9 * u + 0.6), -0.135))


def snout(t):
    if t < T_BITE:
        return snout_pre(t)
    return snout_pre(T_BITE).lerp(hooked_pos(t), sstep(T_BITE, T_BITE + 0.3, t)) + Vector((0, 0, RISE * (t - T_BITE))) * (1 - sstep(T_BITE, T_BITE + 0.3, t))


def lure_now(t):
    """主役がねらうハリ（いちばん下）。掛かったあとは口の中"""
    return free_end(0, t) if t < T_BITE else snout(t)


def rig(t):
    """opening.py の parts.Sabiki に渡す：オモリの上の端と、[(幹糸の結び目, ハリスの先)]"""
    return sink(t), [(knot(j, t), lure_now(t) if j == 0 else free_end(j, t)) for j in range(N_HOOK)]


def heading(t):
    base = Vector((-1.0, 0.0, 0.16)).normalized()          # 左向きで、頭を少し上げて浮く
    if t < T_DASH:
        return base
    u = t - T_BITE
    if t < T_BITE:
        to = free_end(0, t) - snout(t)
        to = to.normalized() if to.length > 1e-4 else base
        return base.lerp(to, sstep(T_DASH, T_BITE - 0.05, t)).normalized()
    hk = Vector((-0.35 + 0.30 * math.sin(2 * math.pi * 2.2 * u), 0.25 * math.sin(2 * math.pi * 1.7 * u), 0.9)).normalized()
    return base.lerp(hk, sstep(T_BITE - 0.05, T_BITE + 0.35, t)).normalized()


def swim(t):
    """尾を振る位相（回）と振れ幅。浮いている間はゆっくり、寄る時と掛かった後は速く"""
    def freq(x):
        if x < T_DASH:
            return 1.4
        if x < T_BITE:
            return 5.0
        return 4.0
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.05 + 0.06 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.12
        return lure_now(x) * 0.45 + body * 0.55 + Vector((0, 0, -0.10))
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
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 0.06 * math.sin(0.5 * t + ph), y0 + 0.05 * math.sin(0.4 * t + 2 * ph), z0 + 0.05 * math.sin(0.8 * t + ph) + 0.03 * t))
    d = Vector((-1.0, 0.05 * math.cos(0.5 * t + ph), 0.16 + 0.05 * math.sin(0.6 * t + ph))).normalized()
    return p, d, (1.2 * t + ph, 0.045), ln
