# アカデミー R9「魚にも『昼型』と『夜型』がいる？」（cg-hiruyoru）の冒頭：昼の明るい砂の海底の上を、マダイ（Fish Kit madai、CC0）が
# ゆったり泳ぐ。主役の1匹はカメラの近くを左から右へ、うしろを別のマダイ6匹が同じ向きに通る（マダイは島根県の調査で「昼タイプ」）。
# 仕掛けはなし（LURE = "none"）。動きは時刻 t（秒）だけで決まる。opening.py から読む。海底は z=0（単位 m）。
import math
from mathutils import Vector

FISH = "madai"
FISH_LEN = None     # モデルのまま（45cm）
LURE = "none"
SEC = 16.0          # 冒頭の章の見積もり（narrate.py --silent 約11秒）×1.3＋1秒より長く
T_THUMB = 6.5
CAM_OFF = (0.35, -1.9, -0.18)
LENS = 35
CAM_KMAX = 1.0
T_BITE = 99.0
THUMB_SHIFT = -0.30
THUMB_K = 1.0

# うしろのマダイ（x0, y0, z0, 長さ, 位相）。カメラ（-y 側）から 2〜5m 奥。左から右へ
SCHOOL = [(-2.4, 2.2, 0.95, 0.42, 0.0), (-3.6, 3.1, 1.35, 0.46, 1.7), (-1.6, 3.9, 0.85, 0.44, 3.1),
          (-4.6, 4.4, 1.6, 0.45, 4.4), (-3.0, 5.2, 1.15, 0.40, 2.2), (-5.4, 2.8, 1.05, 0.43, 5.3)]


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def snout(t):
    """主役の口先：左から右へゆったり（0.11 m/s）。底から 0.7〜0.85m"""
    x = -0.75 + 0.11 * t + 0.03 * math.sin(0.7 * t)
    y = 0.05 * math.sin(0.45 * t + 0.4)
    z = 0.78 + 0.05 * math.sin(0.6 * t)
    return Vector((x, y, z))


def heading(t):
    v = snout(t + 0.05) - snout(t - 0.05)
    return v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))


def swim(t):
    return 1.6 * t, 0.06


def lure_now(t):
    return snout(t)


def lure_axis(t):
    return None


def cam_target(t):
    # 主役の体の中ほどを、なめらかに追う
    acc = Vector((0, 0, 0))
    for i in range(9):
        x = t + (i - 4) * 0.08
        acc += snout(x) - heading(x) * 0.2
    return acc / 9 + Vector((0.0, 0.0, 0.02))


def sep(t):
    return 0.0


def focus(t):
    return snout(t)


def school(i, t):
    x0, y0, z0, ln, ph = SCHOOL[i]
    p = Vector((x0 + 0.22 * t, y0 + 0.1 * math.sin(0.4 * t + ph), z0 + 0.08 * math.sin(0.6 * t + ph)))
    d = Vector((1.0, 0.05 * math.cos(0.4 * t + ph), 0.05 * math.cos(0.6 * t + ph))).normalized()
    return p, d, (1.5 * t + ph, 0.06), ln
