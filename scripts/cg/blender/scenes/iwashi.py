# アカデミー R13「もしもイワシがいなくなったら？」（cg-iwashi）の冒頭：明るい中層で、カタクチイワシ（Fish Kit katakuchi、CC0）の
# 群れが球のように回る（ベイトボール）。主役の1匹は手前の外側を泳ぐ。終わりの約4秒で群れが外へ散り、画面から消えて、
# 何もいない海が残る（「いなくなったら？」）。仕掛けはなし（LURE = "none"）。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "katakuchi"
FISH_LEN = 0.13
LURE = "none"
SEC = 12.0          # 冒頭の章（約10.5秒）より少し長く
T_THUMB = 4.0
CAM_OFF = (0.35, -1.75, -0.12)
LENS = 30
CAM_KMAX = 1.0
T_BITE = 99.0
THUMB_SHIFT = -0.24
THUMB_K = 1.05

C = Vector((0.0, 0.0, 2.3))   # 群れの中心（底から2.3m）
R = 0.48                      # 群れの半径
T_GO = SEC - 4.2              # 散り始め


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def h(i, k):
    """決まった乱数（0〜1）"""
    v = math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return v - math.floor(v)


N = 64
SCHOOL = list(range(N))


def burst(t, i):
    return sstep(T_GO + 0.5 * h(i, 9), T_GO + 3.2 + 0.4 * h(i, 9), t)


def ring(i, t):
    """i 番目の魚の口先と向き。群れの中を縦の軸のまわりに回る。散ると外へ泳ぎ去る"""
    th0, rr, zz, w = 6.283 * h(i, 1), 0.35 + 0.65 * math.sqrt(h(i, 2)), 2 * h(i, 3) - 1, 0.8 + 0.4 * h(i, 4)
    d = -1 if i % 6 == 0 else 1
    th = th0 + d * 0.6 * w * t
    b = burst(t, i)
    r = R * rr
    z = C.z + R * 0.7 * zz * (1 + 1.2 * b) + 0.03 * math.sin(1.3 * t + 6 * h(i, 5))
    # 散るときはカメラ（-y）から離れる向きへ（カメラの前を横切らないように）
    out = Vector((1.3 * math.cos(th), abs(math.sin(th)) + 0.6, 0.1 * zz)).normalized()
    p = Vector((C.x + r * math.cos(th), C.y + r * math.sin(th), z)) + out * (R * 12 * b ** 1.6)
    tang = Vector((-math.sin(th) * d, math.cos(th) * d, 0.08 * math.cos(0.9 * t + i)))
    hd = tang.lerp(out, sstep(0.0, 0.5, b)).normalized()
    return p, hd


def school(i, t):
    p, d = ring(i, t)
    ln = FISH_LEN * (0.85 + 0.3 * h(i, 6))
    return p, d, (3.0 * t + h(i, 7), 0.09), ln


# 主役：群れの手前（カメラ側 -y）の外側を、群れと同じ向きに回る
def snout(t):
    th = -1.75 + 0.55 * t
    b = sstep(T_GO + 0.8, T_GO + 3.6, t)
    r = R + 0.12
    p = Vector((C.x + r * math.cos(th), C.y + r * math.sin(th), C.z + 0.05 + 0.04 * math.sin(0.8 * t) + 0.6 * b))
    return p + Vector((0.5, 1.0, 0.1)).normalized() * (6.0 * b ** 1.6)


def heading(t):
    v = snout(t + 0.04) - snout(t - 0.04)
    return v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))


def swim(t):
    return 3.2 * t, 0.09


def lure_now(t):
    return C


def lure_axis(t):
    return None


def cam_target(t):
    return C + Vector((0.0, 0.0, -0.05 + 0.03 * math.sin(0.3 * t)))


def sep(t):
    return 0.0


def focus(t):
    # はじめは主役の口先、散り始めたら群れの中心へ
    return snout(t).lerp(C, sstep(T_GO, T_GO + 1.5, t))
