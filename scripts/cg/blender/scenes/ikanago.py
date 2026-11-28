# アカデミー R16「イカナゴは夏、砂の中で眠る？」（cg-ikanago）の冒頭：瀬戸内海の砂の海底すれすれを、細長い小魚の群れがゆったり
# 輪をえがいて泳ぎ、終わりに向けて少しずつ砂へ近づく（もぐる場面は three.js の断面の模式図で見せる）。Fish Kit にイカナゴのモデルが
# ないので、形の近い細長い小魚カタクチイワシ（katakuchi、CC0）を使い、画面に断り書きを出す（動きはイメージ）。仕掛けはなし（LURE = "none"）。
# iwashi.py をもとに、群れを平たく低くし、散らさない。動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "katakuchi"
FISH_LEN = 0.12
LURE = "none"
SEC = 14.0          # 冒頭の章（見積もり 9.7秒）×1.3＋1秒
T_THUMB = 5.0
CAM_OFF = (0.3, -1.3, 0.17)   # test（-1.8）は魚が小さかったので近づけた
LENS = 30
CAM_KMAX = 1.0
T_BITE = 99.0
THUMB_SHIFT = -0.24
THUMB_K = 1.05

C = Vector((0.0, 0.2, 0.62))   # 群れの中心（底から0.62m）
R = 0.62                       # 群れの半径（横）


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def h(i, k):
    """決まった乱数（0〜1）"""
    v = math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return v - math.floor(v)


N = 48
SCHOOL = list(range(N))


def low(t):
    """終わりに向けて群れが砂へ近づく量（m）"""
    return 0.2 * sstep(SEC - 6.0, SEC - 1.0, t)


def ring(i, t):
    """i 番目の魚の口先と向き。平たい群れの中を縦の軸のまわりに回る"""
    th0, rr, zz, w = 6.283 * h(i, 1), 0.3 + 0.7 * math.sqrt(h(i, 2)), 2 * h(i, 3) - 1, 0.8 + 0.4 * h(i, 4)
    th = th0 + 0.45 * w * t
    r = R * rr
    z = C.z - low(t) + 0.16 * zz + 0.02 * math.sin(1.3 * t + 6 * h(i, 5))
    p = Vector((C.x + r * math.cos(th), C.y + r * math.sin(th), z))
    tang = Vector((-math.sin(th), math.cos(th), -0.03 * math.cos(0.9 * t + i)))
    return p, tang.normalized()


def school(i, t):
    p, d = ring(i, t)
    ln = FISH_LEN * (0.85 + 0.3 * h(i, 6))
    return p, d, (2.8 * t + h(i, 7), 0.08), ln


# 主役：群れの手前（カメラ側 -y）の外側を、群れと同じ向きに回る
def snout(t):
    th = -1.9 + 0.4 * t
    r = R + 0.14
    return Vector((C.x + r * math.cos(th), C.y + r * math.sin(th), C.z - 0.05 - low(t) + 0.03 * math.sin(0.8 * t)))


def heading(t):
    v = snout(t + 0.04) - snout(t - 0.04)
    return v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))


def swim(t):
    return 3.0 * t, 0.08


def lure_now(t):
    return C


def lure_axis(t):
    return None


def cam_target(t):
    return C + Vector((0.0, 0.0, -0.12 - 0.5 * low(t) + 0.02 * math.sin(0.3 * t)))


def sep(t):
    return 0.0


def focus(t):
    return snout(t)
