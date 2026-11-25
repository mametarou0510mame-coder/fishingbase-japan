# 見える化「堤防の足音・話し声は魚に届く？」（cg-oto）の冒頭：堤防（岸壁）の足もと。左に壁のように立つ堤防のすそ、
# その前に積まれた捨て石。クロダイ（Fish Kit kurodai、CC0）が石の上をゆったり右へ泳ぎ、うしろを5匹が通る。
# 仕掛けはなし（LURE = "none"）。地形は模式図、魚の動きはイメージ。動きは時刻 t（秒）だけで決まる。opening.py から読む。砂の底は z=0（単位 m）。
# 確かめ：python3 scripts/cg/blender/check_scene.py oto（魚の下端は石・壁から 0.2m 以上）
import math
from mathutils import Vector

FISH = "kurodai"
FISH_LEN = 0.42
LURE = "none"
ENV = "reef"        # parts.build_reef：堤防のすその壁と捨て石を高さの式 reef_h で作る
SEC = 12.0          # 冒頭の章の見積もり（narrate.py --silent 約7.6秒）×1.3＋1秒より長く
T_THUMB = 7.0
CAM_OFF = (0.45, -1.85, -0.12)
LENS = 32
CAM_KMAX = 1.0
T_BITE = 99.0
THUMB_SHIFT = -0.25
THUMB_K = 1.0

# 捨て石：(x, y, 半径, 高さ)
STONES = [(-0.80, -0.7, 0.32, 0.45), (-0.70, 0.45, 0.36, 0.50), (-0.95, 1.45, 0.34, 0.48), (-1.05, 2.5, 0.38, 0.55),
          (-1.20, -1.6, 0.32, 0.42), (-0.65, 3.4, 0.30, 0.40), (-1.30, 0.95, 0.32, 0.50), (-1.25, 3.3, 0.34, 0.5)]
# うしろのクロダイ（x0, y0, z0, 長さ, 位相）。カメラ（-y 側）から 2〜4.5m 奥。左から右へ
SCHOOL = [(-0.9, 2.0, 1.25, 0.40, 0.0), (-0.5, 2.9, 1.55, 0.44, 1.7), (-0.2, 3.6, 1.15, 0.38, 3.1),
          (-0.9, 4.2, 1.75, 0.42, 4.4), (0.3, 4.8, 1.35, 0.40, 2.2)]


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def reef_h(x, y):
    """砂の底からの高さ。左は堤防のすそ（壁、高さ 3.5m）、その前に捨て石"""
    wall = sstep(-1.55, -1.8, x) * 3.5
    st = 0.0
    for sx, sy, r, h in STONES:
        d2 = ((x - sx) ** 2 + (y - sy) ** 2) / (r * r)
        if d2 < 1.0:
            st = max(st, h * math.sqrt(1.0 - d2))
    rough = 0.03 * math.sin(5.1 * x + 1.7 * y) * math.sin(4.3 * y - 0.9 * x)
    v = max(wall, st)
    return max(0.0, v + rough * min(v / 0.2, 1.0))


def kelp_keep_out(x, y):
    """海藻は壁のすそだけ（魚の通り道にはおかない）"""
    return x > -1.45


def snout(t):
    """主役の口先：石の上を左から右へゆったり（0.1 m/s）。底から 0.85m 前後"""
    x = -0.45 + 0.10 * t + 0.015 * math.sin(0.7 * t)
    y = 0.15 + 0.05 * math.sin(0.45 * t + 0.4)
    z = 0.92 + 0.025 * math.sin(0.6 * t)
    return Vector((x, y, z))


def heading(t):
    v = snout(t + 0.05) - snout(t - 0.05)
    return v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))


def swim(t):
    return 1.4 * t, 0.06


def lure_now(t):
    return snout(t)


def lure_axis(t):
    return None


def cam_target(t):
    acc = Vector((0, 0, 0))
    for i in range(9):
        x = t + (i - 4) * 0.08
        acc += snout(x) - heading(x) * 0.2
    return acc / 9 + Vector((-0.15, 0.0, 0.05))


def sep(t):
    return 0.0


def focus(t):
    return snout(t)


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 0.18 * t, y0 + 0.1 * math.sin(0.4 * t + ph), z0 + 0.07 * math.sin(0.6 * t + ph)))
    d = Vector((1.0, 0.05 * math.cos(0.4 * t + ph), 0.04 * math.cos(0.6 * t + ph))).normalized()
    return p, d, (1.4 * t + ph, 0.06), ln
