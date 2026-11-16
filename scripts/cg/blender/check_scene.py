# Blender の場面（scenes/<scene>.py）の式を、Blender なしで確かめる道具。
#   python3 scripts/cg/blender/check_scene.py mebaru
# mathutils.Vector の代わり（足し算・長さ・lerp など、場面の式で使うものだけ）を入れて、全コマで
#   ・式が止まらないこと　・魚（主役と群れ）の下端と海底（根があれば reef_h）のすきま　・食う前に口が仕掛けを突き抜けないこと
# を出す。すきまは 0.2m 以上あること。
import importlib.util, math, os, sys, types


class Vector:
    def __init__(self, v=(0.0, 0.0, 0.0)):
        self.v = [float(a) for a in v]
    x = property(lambda s: s.v[0]); y = property(lambda s: s.v[1])
    z = property(lambda s: s.v[2], lambda s, a: s.v.__setitem__(2, float(a)))
    def __getitem__(s, i): return s.v[i]
    def __iter__(s): return iter(s.v)
    def __add__(s, o): return Vector([a + b for a, b in zip(s.v, o.v)])
    def __sub__(s, o): return Vector([a - b for a, b in zip(s.v, o.v)])
    def __neg__(s): return Vector([-a for a in s.v])
    def __mul__(s, k): return Vector([a * k for a in s.v])
    __rmul__ = __mul__
    def __truediv__(s, k): return Vector([a / k for a in s.v])
    length = property(lambda s: math.sqrt(sum(a * a for a in s.v)))
    def normalized(s): return s / s.length if s.length > 0 else Vector()
    def lerp(s, o, k): return s + (o - s) * k
    def dot(s, o): return sum(a * b for a, b in zip(s.v, o.v))
    def cross(s, o): return Vector([s.v[1] * o.v[2] - s.v[2] * o.v[1], s.v[2] * o.v[0] - s.v[0] * o.v[2], s.v[0] * o.v[1] - s.v[1] * o.v[0]])


sys.modules["mathutils"] = types.SimpleNamespace(Vector=Vector)
name = sys.argv[1]
spec = importlib.util.spec_from_file_location("scene", os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes", name + ".py"))
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
floor = getattr(M, "reef_h", lambda x, y: 0.0)
L = M.FISH_LEN or 0.45


def gap(nose, d, ln):
    """体に沿った5点の下端（体高の半分を引く）と海底のすきま"""
    g = 99.0
    horiz = math.hypot(d[0], d[1])
    for k in (0.0, 0.25, 0.5, 0.75, 1.0):
        p = nose - d * (ln * k)
        g = min(g, p.z - 0.17 * ln * horiz - floor(p.x, p.y))
    return g


worst, wt, msep = 99.0, 0.0, 99.0
n = int(M.SEC * 24) + 48
for f in range(n):
    t = f / 24
    s, h = M.snout(t), M.heading(t)
    M.swim(t); M.cam_target(t); M.focus(t); M.lure_now(t)
    if hasattr(M, "rig"):
        M.rig(t)
    g = gap(s, h, L)
    for i in range(len(M.SCHOOL)):
        p, d, _, ln = M.school(i, t)
        g = min(g, gap(p, d, ln))
    if g < worst:
        worst, wt = g, t
    if t < M.T_BITE - 0.05:
        msep = min(msep, M.sep(t))
    if f % 24 == 0:
        c = M.cam_target(t)
        print(f"t={t:4.1f} snout=({s.x:5.2f},{s.y:5.2f},{s.z:5.2f}) head=({h.x:5.2f},{h.y:5.2f},{h.z:5.2f}) sep={M.sep(t):.2f} cam=({c.x:5.2f},{c.y:5.2f},{c.z:5.2f}) floor@snout={floor(s.x, s.y):.2f}")
print(f"min fish clearance {worst:.3f} m at t={wt:.2f}s  {'OK' if worst >= 0.2 else 'NG'}")
print(f"min mouth-lure distance before the bite {msep:.3f} m")
