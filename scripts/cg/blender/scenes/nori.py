# アカデミー R11「冬のチヌはノリを食べに来る？」（cg-nori）の冒頭：浅い海の上のほうに張ったノリ養殖の網（ENV = "nori"、
# parts.build_nori。網の高さ NET_Z、目から暗い赤茶のノリの葉が垂れる）の下に、クロダイ（Fish Kit kurodai、CC0）が集まる。
# 主役の1匹は左から右へ泳ぎ、終わりのほうで頭を上げて葉の先をつつく。うしろの群れの何匹かも葉をつつく（徳島県・岡山県の
# 調査で、ノリ網にクロダイが群れで来て食べる様子が撮影された。動きはイメージ）。仕掛けはなし（LURE = "none"）。
# 動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。網と海の深さは模式図。
import math
from mathutils import Vector

FISH = "kurodai"
FISH_LEN = 0.42
LURE = "none"
ENV = "nori"
NET_Z = 2.6          # 網の高さ（葉の先は 2.2〜2.45m）
SEC = 17.0           # 冒頭の章の見積もり（narrate.py --silent 約12.2秒）×1.3＋1秒
T_THUMB = 13.5
CAM_OFF = (0.3, -1.55, -0.42)
LENS = 38
CAM_KMAX = 1.0
T_BITE = 99.0
THUMB_SHIFT = -0.30
THUMB_K = 1.0

# うしろのクロダイ（x0, y0, z0, 長さ, 位相, つつくか）。カメラ（-y 側）から 1.5〜4.5m 奥
SCHOOL = [(-2.2, 1.6, 1.35, 0.40, 0.0, 0), (-1.0, 2.4, 2.02, 0.44, 1.7, 1), (0.6, 1.9, 1.95, 0.38, 3.1, 1),
          (-3.4, 3.0, 1.55, 0.45, 4.4, 0), (1.6, 3.2, 2.0, 0.42, 2.2, 1), (-0.4, 3.9, 1.25, 0.40, 5.3, 0),
          (2.4, 2.2, 1.45, 0.41, 0.9, 0), (-1.8, 4.4, 2.0, 0.43, 3.7, 1), (0.9, 4.6, 1.6, 0.39, 2.6, 0)]


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def up(t):
    """主役が頭を上げてつつく度合い（0〜1）"""
    return sstep(8.5, 12.0, t)


def snout(t):
    """主役の口先：左から右へゆったり。後半で上がって葉の先（2.2m）をつつく"""
    k = up(t)
    x = -0.95 + 0.12 * t + 0.03 * math.sin(0.7 * t)
    y = 0.25 + 0.04 * math.sin(0.45 * t + 0.4)
    z = 1.55 + 0.05 * math.sin(0.6 * t) + k * (0.62 + 0.04 * math.sin(3.0 * t))
    return Vector((x, y, z))


def heading(t):
    a = 0.06 * math.sin(0.6 * t) + up(t) * (0.5 + 0.08 * math.sin(3.0 * t))
    return Vector((math.cos(a), 0.0, math.sin(a)))


def swim(t):
    return 1.4 * t, 0.06 - 0.03 * up(t)


def lure_now(t):
    return snout(t)


def lure_axis(t):
    return None


def cam_target(t):
    acc = Vector((0, 0, 0))
    for i in range(9):
        x = t + (i - 4) * 0.08
        acc += snout(x) - heading(x) * 0.2
    return acc / 9 + Vector((0.0, 0.0, 0.05))


def sep(t):
    return 0.0


def focus(t):
    return snout(t)


def school(i, t):
    x0, y0, z0, ln, ph, nib = SCHOOL[i]
    if nib:   # 葉の先をつつく：その場でゆっくり上下しながら頭を上げる
        bob = 0.5 + 0.5 * math.sin(1.3 * t + ph)
        p = Vector((x0 + 0.05 * t, y0 + 0.05 * math.sin(0.4 * t + ph), z0 + 0.1 * bob))
        a = 0.45 + 0.15 * bob
        d = Vector((math.cos(a), 0.0, math.sin(a)))
        return p, d, (1.1 * t + ph, 0.04), ln
    p = Vector((x0 + 0.16 * t, y0 + 0.1 * math.sin(0.4 * t + ph), z0 + 0.07 * math.sin(0.6 * t + ph)))
    d = Vector((1.0, 0.05 * math.cos(0.4 * t + ph), 0.04 * math.cos(0.6 * t + ph))).normalized()
    return p, d, (1.4 * t + ph, 0.06), ln
