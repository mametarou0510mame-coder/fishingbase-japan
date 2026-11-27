# アカデミー R12「カツオは昼も夜も浅い？」（cg-katsuo）の冒頭：sawara.py をもとに、浮魚礁（表層型）の係留ロープ（ENV = "fad"、
# parts.build_fad。形は模式図）のまわりを、カツオの群れがゆったり輪をえがいて泳ぐ。Fish Kit にカツオのモデルがないので、
# 同じサバ科のキハダ（kihada、CC0）を使い、画面に断り書きを出す（動きはイメージ）。主役の1匹は手前の外側。仕掛けはなし（LURE = "none"）。
# 散らさない（「いなくなる」話ではない）。動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "kihada"
FISH_LEN = 0.48     # 和歌山県の試験操業で釣れたカツオ（尾叉長 32〜52cm）くらい
LURE = "none"
ENV = "fad"
SEC = 17.0          # 冒頭の章（見積もり）×1.3＋1秒。下の確認で直す
T_THUMB = 6.0
CAM_OFF = (0.8, -3.6, -0.55)
LENS = 30
CAM_KMAX = 1.0
T_BITE = 99.0
THUMB_SHIFT = -0.24
THUMB_K = 1.05

C = Vector((0.0, 1.2, 3.6))   # 群れの中心（底から3.6m）
R = 1.5                      # 群れの半径
FAD_ROPES = [(0.4, 3.6, 0.045)]   # 群れの奥にロープ（カメラは -y 側）


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def h(i, k):
    """決まった乱数（0〜1）"""
    v = math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return v - math.floor(v)


N = 16
SCHOOL = list(range(N))


def ring(i, t):
    """i 番目の魚の口先と向き。群れの中を縦の軸のまわりに回る"""
    th0, rr, zz, w = 6.283 * h(i, 1), 0.4 + 0.6 * math.sqrt(h(i, 2)), 2 * h(i, 3) - 1, 0.8 + 0.4 * h(i, 4)
    th = th0 + 0.30 * w * t
    r = R * rr
    z = C.z + R * 0.45 * zz + 0.04 * math.sin(1.3 * t + 6 * h(i, 5))
    p = Vector((C.x + r * math.cos(th), C.y + r * math.sin(th), z))
    tang = Vector((-math.sin(th), math.cos(th), 0.08 * math.cos(0.9 * t + i)))
    return p, tang.normalized()


def school(i, t):
    p, d = ring(i, t)
    ln = FISH_LEN * (0.85 + 0.25 * h(i, 6))
    return p, d, (1.8 * t + h(i, 7), 0.07), ln


# 主役：群れの手前（カメラ側 -y）の外側を、群れと同じ向きに回る（左から右へ横切る）
def snout(t):
    th = -2.25 + 0.16 * t
    r = R + 0.4
    return Vector((C.x + r * math.cos(th), C.y + r * math.sin(th), C.z + 0.1 + 0.08 * math.sin(0.8 * t)))


def heading(t):
    v = snout(t + 0.04) - snout(t - 0.04)
    return v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))


def swim(t):
    return 1.8 * t, 0.07


def lure_now(t):
    return C


def lure_axis(t):
    return None


def cam_target(t):
    return C + Vector((0.0, 0.0, 0.1 + 0.03 * math.sin(0.3 * t)))


def sep(t):
    return 0.0


def focus(t):
    return snout(t)
