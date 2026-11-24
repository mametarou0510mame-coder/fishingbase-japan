# 使い回せる Blender の部品（2026-11-16）：根（岩礁）・海藻・サビキ（胴付き）仕掛け。
# opening.py から読む。場面（scenes/<scene>.py）で ENV = "reef" や LURE = "sabiki" と書くと使われる。
# 使い方と一覧は docs/strategy/cg-assets.md。単位はメートル、海底（砂）は z=0。
import math
import bpy
import numpy as np
from mathutils import Vector


def _principled(nt):
    return nt.nodes.get("Principled BSDF")


def _set(p, name, value):
    """Blender の版で名前が変わる入力（Subsurface Weight など）は、あれば入れる"""
    try:
        p.inputs[name].default_value = value
    except (KeyError, TypeError):
        pass


# ---------------------------------------------------------------- 根（岩礁）
def b_reefrock(nt, n, l):
    """岩：灰茶のむら＋ところどころ緑の藻。細かい凹凸はバンプ"""
    p = _principled(nt)
    tc = n.new("ShaderNodeTexCoord")
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 2.2
    noi.inputs["Detail"].default_value = 10.0
    noi.inputs["Roughness"].default_value = 0.65
    l.new(tc.outputs["Object"], noi.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.30, (0.016, 0.015, 0.014, 1)
    e[1].position, e[1].color = 0.62, (0.13, 0.115, 0.095, 1)
    a = e.new(0.47)
    a.color = (0.05, 0.047, 0.042, 1)
    b = e.new(0.72)
    b.color = (0.06, 0.11, 0.035, 1)    # 緑の藻
    l.new(noi.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.88
    fine = n.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 26.0
    fine.inputs["Detail"].default_value = 8.0
    l.new(tc.outputs["Object"], fine.inputs["Vector"])
    vor = n.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 7.0
    l.new(tc.outputs["Object"], vor.inputs["Vector"])
    add = n.new("ShaderNodeMath")
    add.operation = "ADD"
    l.new(fine.outputs["Fac"], add.inputs[0])
    l.new(vor.outputs["Distance"], add.inputs[1])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 1.0
    bump.inputs["Distance"].default_value = 0.06
    l.new(add.outputs[0], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], p.inputs["Normal"])


def build_reef(hfn, mat, x0=-7.0, x1=7.0, y0=-4.0, y1=10.0, step=0.07):
    """高さの式 hfn(x, y)（砂の底からの m）から、根の形を作る。高さ 0.02 未満の所は砂に沈める"""
    nx, ny = int((x1 - x0) / step) + 1, int((y1 - y0) / step) + 1
    verts = []
    for j in range(ny):
        y = y0 + j * step
        for i in range(nx):
            x = x0 + i * step
            h = hfn(x, y)
            verts.append((x, y, h if h > 0.02 else -0.08))
    faces = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(ny - 1) for i in range(nx - 1)]
    me = bpy.data.meshes.new("reef")
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    ob = bpy.data.objects.new("reef", me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat("reefrock", b_reefrock))
    # 岩のごつごつ：形そのものを細かく押し出す（大きな割れ目＋細かい凹凸）。reef_h とのずれは 0.1m ほどなので、魚のすきまは余裕を見る
    for nm, kind, scale, strength in (("crag", "VORONOI", 0.42, 0.16), ("grain", "CLOUDS", 0.11, 0.07)):
        tx = bpy.data.textures.new("reef_" + nm, kind)
        tx.noise_scale = scale
        dm = ob.modifiers.new(nm, "DISPLACE")
        dm.texture = tx
        dm.strength = strength
        dm.mid_level = 0.75
    return ob


# ---------------------------------------------------------------- 海藻
def b_kelp(nt, n, l):
    p = _principled(nt)
    tc = n.new("ShaderNodeTexCoord")
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 1.6
    l.new(tc.outputs["Object"], noi.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.025, 0.035, 0.008, 1)
    ramp.color_ramp.elements[1].position = 0.70
    ramp.color_ramp.elements[1].color = (0.16, 0.12, 0.02, 1)
    l.new(noi.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.42
    _set(p, "Subsurface Weight", 0.35)
    _set(p, "Subsurface Radius", (0.02, 0.03, 0.005))


class Kelp:
    """帯の葉の海藻。roots：[(x, y, z, 長さ, 向き, 位相)]。update(t) で毎コマゆらす（動きは時刻 t だけで決まる）"""
    NS = 10

    def __init__(self, roots, mat, width=0.05, lean=(0.2, 0.0), name="kelp", build=None):
        self.r = np.array(roots, dtype=float)
        self.lean = lean
        self.width = width
        nb, ns = len(roots), self.NS
        faces = []
        for b in range(nb):
            o = b * (ns + 1) * 2
            faces += [(o + 2 * i, o + 2 * i + 1, o + 2 * i + 3, o + 2 * i + 2) for i in range(ns)]
        me = bpy.data.meshes.new(name)
        me.from_pydata([(0, 0, 0)] * (nb * (ns + 1) * 2), [], faces)
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        self.ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(self.ob)
        me.materials.append(mat(name, build or b_kelp))
        sol = self.ob.modifiers.new("s", "SOLIDIFY")
        sol.thickness = 0.004
        self.update(0.0)

    def update(self, t):
        r, ns = self.r, self.NS
        u = np.linspace(0.0, 1.0, ns + 1)[None, :]                     # 根もと 0 → 先 1
        L, yaw, ph = r[:, 3:4], r[:, 4:5], r[:, 5:6]
        sway = self.lean[0] + 0.16 * np.sin(1.1 * t + ph + 3.4 * u) + 0.05 * np.sin(2.3 * t + 1.7 * ph + 7.0 * u)     # 潮の向き（+x）へなびく＋ゆれ
        cx = r[:, 0:1] + sway * u * u * L
        cy = r[:, 1:2] + (self.lean[1] + 0.06 * np.cos(0.9 * t + 1.3 * ph + 2.0 * u)) * u * u * L
        cz = r[:, 2:3] + u * L * (1.0 - 0.12 * u)
        w = self.width * (0.35 + 0.65 * np.sin(np.pi * np.clip(u, 0.0, 1.0) ** 0.7)) * (0.7 + 0.3 * np.sin(ph * 7.0))
        ox, oy = np.cos(yaw) * w, np.sin(yaw) * w
        V = np.empty((r.shape[0], ns + 1, 2, 3))
        V[:, :, 0, 0], V[:, :, 0, 1], V[:, :, 0, 2] = cx - ox, cy - oy, cz
        V[:, :, 1, 0], V[:, :, 1, 1], V[:, :, 1, 2] = cx + ox, cy + oy, cz
        self.ob.data.vertices.foreach_set("co", V.ravel())
        self.ob.data.update()


def kelp_roots(hfn, n=300, seed=11, x=(-5.0, 5.0), y=(0.5, 7.0), hmin=0.45, keep_out=None):
    """根の上（高さ hmin 以上）に海藻を生やす場所を選ぶ。keep_out(x, y) が True の所（魚と仕掛けの通り道）には生やさない"""
    rng = np.random.default_rng(seed)
    out = []
    guard = 0
    while len(out) < n and guard < 20000:
        guard += 1
        px, py = rng.uniform(*x), rng.uniform(*y)
        h = hfn(px, py)
        if h < hmin or (keep_out and keep_out(px, py)):
            continue
        for _ in range(int(rng.integers(4, 9))):
            if len(out) >= n:
                break
            out.append((px + rng.uniform(-0.1, 0.1), py + rng.uniform(-0.1, 0.1), h - 0.12, rng.uniform(0.35, 1.05), rng.uniform(0, math.pi), rng.uniform(0, 6.28)))
    return out


# ---------------------------------------------------------------- サビキ（胴付き）仕掛け
def b_skin(nt, n, l):
    """サビキの魚の皮：白くて真珠のように光る"""
    p = _principled(nt)
    p.inputs["Base Color"].default_value = (0.92, 0.97, 0.90, 1)
    p.inputs["Metallic"].default_value = 0.55
    p.inputs["Roughness"].default_value = 0.22
    _set(p, "Coat Weight", 0.6)
    _set(p, "Emission Color", (0.9, 1.0, 0.9, 1))
    _set(p, "Emission Strength", 0.45)


def b_bead(nt, n, l):
    p = _principled(nt)
    p.inputs["Base Color"].default_value = (0.75, 1.0, 0.25, 1)
    _set(p, "Emission Color", (0.75, 1.0, 0.25, 1))
    _set(p, "Emission Strength", 1.6)


def b_branch(nt, n, l):
    p = _principled(nt)
    p.inputs["Base Color"].default_value = (0.95, 0.95, 0.9, 1)
    _set(p, "Emission Color", (0.95, 0.95, 0.9, 1))
    _set(p, "Emission Strength", 0.5)


def b_lead(nt, n, l):
    p = _principled(nt)
    p.inputs["Base Color"].default_value = (0.42, 0.44, 0.46, 1)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.42


class Sabiki:
    """オモリ・幹糸・枝（ハリス）・ハリ・魚の皮・ビーズ。
    update(sink, hooks)：sink＝オモリの上の端（Vector）、hooks＝[(幹糸の結び目 P, ハリスの先 E)]。幹糸と道糸は line（opening.py の糸）をそのまま使う"""

    def __init__(self, n, mat, make_curve, make_ribbon, hookm, line, k=1.6):
        self.n, self.k, self.line = n, k, line
        bm, sm, dm = mat("sb_branch", b_branch), mat("sb_skin", b_skin), mat("sb_bead", b_bead)
        self.branch = [make_curve(f"sb_br{i}", 3, 0.00035, bm) for i in range(n)]
        self.hook = [make_curve(f"sb_hk{i}", 5, 0.00045 * k, hookm) for i in range(n)]
        self.skin = [make_ribbon(f"sb_sk{i}", 8, sm) for i in range(n)]
        self.bead = []
        for i in range(n):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.0019 * k)
            o = bpy.context.object
            o.data.materials.append(dm)
            self.bead.append(o)
        # オモリ（ナス型 約4.5cm）：上の端が原点
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1.0)
        self.sink = bpy.context.object
        bpy.ops.object.shade_smooth()
        me = self.sink.data
        for v in me.vertices:
            f = (v.co.z + 1.0) / 2.0                                   # 0＝下 1＝上
            w = 0.0115 * (0.25 + 0.75 * math.sin(math.pi * min(max(f, 0.0), 1.0) ** 0.62) ** 0.85)   # 下ぶくれ
            v.co.x, v.co.y, v.co.z = v.co.x * w, v.co.y * w, (f - 1.0) * 0.046
        me.materials.append(mat("sb_lead", b_lead))

    def update(self, sink, hooks, t):
        k = self.k
        self.sink.location = sink
        self.line.rotation_mode = "QUATERNION"
        self.line.rotation_quaternion = (1, 0, 0, 0)
        self.line.location = sink + Vector((0, 0, 6.0))
        self.line.scale = (1.2, 1.2, 12.0)
        for i, (P, E) in enumerate(hooks[: self.n]):
            d = (E - P)
            ln = d.length
            d = d.normalized() if ln > 1e-6 else Vector((1, 0, 0))
            side = d.cross(Vector((0, 0, 1)))
            side = side.normalized() if side.length > 1e-4 else Vector((0, 1, 0))
            up = side.cross(d).normalized()
            sag = Vector((0, 0, -0.012)) * min(ln / 0.14, 1.0)
            bp = self.branch[i].data.splines[0].bezier_points
            for j, q in enumerate([P, P.lerp(E, 0.5) + sag, E]):
                bp[j].co = q
            self.bead[i].location = E
            # ハリ：軸がハリスの向きへ伸び、下へ曲がって針先が戻る
            a, r = 0.012 * k, 0.0038 * k
            shape = [E, E + d * a, E + d * (a + r) - up * r, E + d * a - up * 2 * r, E + d * (a - r * 1.2) - up * 1.7 * r]
            for j, q in enumerate(self.hook[i].data.splines[0].bezier_points):
                q.co = shape[j]
            # 魚の皮：ハリの軸に沿った細い葉の形。先がひらひら揺れる
            nv = len(self.skin[i].data.vertices) // 2
            co = []
            for j in range(nv):
                u = j / (nv - 1)
                c = E + d * (0.002 + 0.030 * k * u) + up * (0.0015 + 0.004 * k * u * math.sin(2 * math.pi * 3.1 * t + i + 4 * u))
                w = 0.0048 * k * math.sin(math.pi * min(u * 0.92 + 0.08, 1.0)) ** 0.8
                co += [tuple(c - side * w), tuple(c + side * w)]
            self.skin[i].data.vertices.foreach_set("co", [x for q in co for x in q])
            self.skin[i].data.update()


# ---------------------------------------------------------------- テトラ（消波ブロック）2026-11-18
# 場面に ENV = "tetra" と TETRA = [(x, y, z, rx, ry, rz, s), ...]（中心・回転[rad]・大きさ）を書くと作る。
# 形は three.js の tetrapodGeometry と同じ：中心の球（半径 0.6s）と、4本の脚（根元の半径 0.55s・先 0.32s・長さ 1.5s）
TETRA_DIRS = [(1, 1, 1), (-1, -1, 1), (-1, 1, -1), (1, -1, -1)]


def tetra_legs(x, y, z, rx, ry, rz, s):
    """脚の [(根元, 先, 根元の半径, 先の半径)]。魚がテトラにめりこまないかの確かめにも使う（Blender なしで動く）"""
    cx, sx, cy_, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)

    def rot(v):  # XYZ のオイラー角（Blender の既定と同じ順）
        a, b, c = v
        b, c = b * cx - c * sx, b * sx + c * cx
        a, c = a * cy_ + c * sy, -a * sy + c * cy_
        a, b = a * cz - b * sz, a * sz + b * cz
        return (a, b, c)
    out = []
    for d in TETRA_DIRS:
        n = math.sqrt(3.0)
        r = rot((d[0] / n, d[1] / n, d[2] / n))
        out.append(((x, y, z), (x + r[0] * 1.5 * s, y + r[1] * 1.5 * s, z + r[2] * 1.5 * s), 0.55 * s, 0.32 * s))
    return out


def tetra_dist(p, tetras):
    """点 p からいちばん近いテトラの表面までの距離（中が負）。脚は円すい台、中心は球で近似"""
    best = 99.0
    for (x, y, z, rx, ry, rz, s) in tetras:
        best = min(best, math.dist(p, (x, y, z)) - 0.6 * s)
        for a, b, ra, rb in tetra_legs(x, y, z, rx, ry, rz, s):
            ab = [b[i] - a[i] for i in range(3)]
            ap = [p[i] - a[i] for i in range(3)]
            L2 = sum(v * v for v in ab)
            k = max(0.0, min(1.0, sum(ap[i] * ab[i] for i in range(3)) / L2))
            q = [a[i] + ab[i] * k for i in range(3)]
            best = min(best, math.dist(p, q) - (ra + (rb - ra) * k))
    return best


def b_concrete(nt, n, l):
    """テトラのコンクリート：明るい灰色のむら、下の方は藻で緑がかる、細かいざらざら"""
    p = _principled(nt)
    tc = n.new("ShaderNodeTexCoord")
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 3.0
    noi.inputs["Detail"].default_value = 8.0
    l.new(tc.outputs["Object"], noi.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.35, (0.16, 0.17, 0.16, 1)
    e[1].position, e[1].color = 0.70, (0.36, 0.37, 0.35, 1)
    g = e.new(0.52)
    g.color = (0.12, 0.16, 0.09, 1)    # 藻
    l.new(noi.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.9
    fine = n.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 60.0
    fine.inputs["Detail"].default_value = 6.0
    l.new(tc.outputs["Object"], fine.inputs["Vector"])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.5
    bump.inputs["Distance"].default_value = 0.01
    l.new(fine.outputs["Fac"], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], p.inputs["Normal"])


def build_tetra(tetras, mat):
    """テトラを並べる。形は1つ作って、メッシュを共有したコピーを置く"""
    parts_ = []
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.6, location=(0, 0, 0))
    parts_.append(bpy.context.object)
    for d in TETRA_DIRS:
        v = Vector(d).normalized()
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.55, radius2=0.32, depth=1.5, location=v * 0.75)
        c = bpy.context.object
        c.rotation_mode = "QUATERNION"
        c.rotation_quaternion = v.to_track_quat("Z", "Y")
        parts_.append(c)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts_:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts_[0]
    bpy.ops.object.join()
    base = bpy.context.object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    wn = base.modifiers.new("wn", "WEIGHTED_NORMAL")  # 脚のつけ根をなめらかに見せる
    wn.keep_sharp = False
    base.data.materials.append(mat("tetra", b_concrete))
    obs = []
    for i, (x, y, z, rx, ry, rz, s) in enumerate(tetras):
        o = base if i == 0 else base.copy()
        if i:
            bpy.context.scene.collection.objects.link(o)
        o.location = (x, y, z)
        o.rotation_mode = "XYZ"
        o.rotation_euler = (rx, ry, rz)
        o.scale = (s, s, s)
        obs.append(o)
    return obs


# ---------------------------------------------------------------- ノリ養殖の網と垂れるノリ（2026-11-24 cg-nori）
def b_nori(nt, n, l):
    """ノリの葉：暗い赤茶〜こげ茶、光が少し透ける"""
    p = _principled(nt)
    tc = n.new("ShaderNodeTexCoord")
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 3.0
    l.new(tc.outputs["Object"], noi.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.035, 0.012, 0.008, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.09, 0.05, 0.012, 1)
    l.new(noi.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.45
    _set(p, "Subsurface Weight", 0.3)
    _set(p, "Subsurface Radius", (0.03, 0.012, 0.005))


def b_netrope(nt, n, l):
    p = _principled(nt)
    p.inputs["Base Color"].default_value = (0.62, 0.62, 0.55, 1)
    p.inputs["Roughness"].default_value = 0.8


def build_nori(z, mat, x=(-4.0, 4.0), y=(-1.0, 6.0), step=0.3, n=1600, seed=5):
    """高さ z に水平のノリ網（step m の目）を張り、目から葉を垂らす。戻り値の update(t) で毎コマゆらす（時刻 t だけで決まる）"""
    nx, ny = int(round((x[1] - x[0]) / step)), int(round((y[1] - y[0]) / step))
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=nx, y_subdivisions=ny, size=1.0)
    g = bpy.context.object
    g.name = "norinet"
    g.scale = (x[1] - x[0], y[1] - y[0], 1.0)
    g.location = ((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, z)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    w = g.modifiers.new("w", "WIREFRAME")
    w.thickness = 0.012
    g.data.materials.append(mat("netrope", b_netrope))
    rng = np.random.default_rng(seed)
    roots = []
    for _ in range(n):
        px = x[0] + step * int(rng.integers(1, nx))
        py = y[0] + step * int(rng.integers(1, ny))
        roots.append((px + rng.uniform(-0.03, 0.03), py + rng.uniform(-0.03, 0.03), z, -rng.uniform(0.16, 0.38), rng.uniform(0, math.pi), rng.uniform(0, 6.28)))
    return Kelp(roots, mat, width=0.018, lean=(0.12, 0.0), name="nori", build=b_nori)
