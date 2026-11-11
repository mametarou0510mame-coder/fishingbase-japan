# Blender（Cycles）でタイラバとマダイの10秒を書き出す。three.js 版との見比べ用（2026-11-12 オーナー依頼）。
#   blender -b -P scripts/cg/blender/tairaba_compare.py -- --frames 1,90,200,260 --out out/ --samples 24 --res 960 540
#   blender -b -P scripts/cg/blender/tairaba_compare.py -- --range 1 20 --out out/
# 動きは時刻 t だけで決まる（どのコマからでも同じ絵になる）ので、コマを分けて並べて書き出せる。
# 単位はメートル。海底は z=0。魚（Fish Kit の madai、CC0）は海底より上だけを泳ぐ。
import bpy, math, sys, os, time
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, n=1, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1:i + 1 + n] if n > 1 else argv[i + 1]
    return default

FPS = 30
NF = 300
if arg("--frames"):
    FRAMES = [int(x) for x in arg("--frames").split(",")]
elif arg("--range", 2):
    a, b = arg("--range", 2)
    FRAMES = list(range(int(a), int(b) + 1))
else:
    FRAMES = list(range(1, NF + 1))
OUT = arg("--out", default="build/blender/")
SAMPLES = int(arg("--samples", default="96"))
RES = [int(x) for x in arg("--res", 2, default=["1280", "720"])]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FISH = os.path.join(ROOT, "scripts/cg/vendor/fishkit/fish/madai.glb")
os.makedirs(OUT, exist_ok=True)


def sstep(a, b, x):
    x = min(max((x - a) / (b - a), 0.0), 1.0)
    return x * x * (3 - 2 * x)


def lerp(a, b, k):
    return a + (b - a) * k


# ---------------- 動き（時刻 t 秒だけで決まる） ----------------
RISE = 0.55        # 等速巻きの上がる速さ m/s
T_DASH, T_BITE = 7.9, 8.3
LEN = 0.451        # マダイの長さ（モデルのまま 45cm）


def lure(t):
    """タイラバの頭の位置。着底 → 0.4 秒で巻き始め（タッチ＆ゴー）→ 等速で上がる"""
    z = 0.045 + RISE * max(t - 0.4, 0.0)
    return Vector((0.012 * math.sin(2.1 * t), 0.010 * math.sin(1.3 * t + 1.0), z))


def follow(t):
    """追う位置（口の先）：タイラバの少し後ろ下。ゆっくり左右に揺れる。海底近くでは下げすぎない"""
    f = lure(t) + Vector((-0.30 + 0.04 * math.sin(1.7 * t), 0.10 * math.sin(0.8 * t), -0.20 + 0.03 * math.sin(1.1 * t)))
    f.z = max(f.z, 0.42)
    return f


S0 = Vector((-1.7, 1.0, 0.45))


def snout_pre(t):
    if t < 3.4:
        return S0.lerp(follow(t), sstep(0.0, 3.4, t))
    if t < T_DASH:
        return follow(t)
    # 食いつく：スカートの下へ一気に寄る
    return follow(t).lerp(lure(t) + Vector((0, 0, -0.03)), sstep(T_DASH, T_BITE, t))


SB = snout_pre(T_BITE)


def snout(t):
    if t < T_BITE:
        return snout_pre(t)
    u = t - T_BITE
    # 掛かった後：糸に引かれて上がりながら、首を振る
    return SB + Vector((0.03 * math.sin(2 * math.pi * 2.6 * u), 0.04 * math.sin(2 * math.pi * 1.9 * u + 0.6), 0.30 * u))


def lure_now(t):
    return lure(t) if t < T_BITE else snout(t)


def heading(t):
    S = snout(t)
    if t < T_BITE:
        v = (snout(t + 0.05) - snout(t - 0.05))
        v = v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))
        to = lure(t) - S
        to = to.normalized() if to.length > 1e-4 else v
        d = v.lerp(to, sstep(1.6, 3.4, t)).normalized()
    else:
        d = Vector((1, 0, 0))
    u = t - T_BITE
    hk = Vector((0.75 * math.cos(0.5 * math.sin(2 * math.pi * 1.3 * u)), 0.75 * math.sin(0.5 * math.sin(2 * math.pi * 1.3 * u)), 0.62)).normalized()
    k = sstep(T_BITE - 0.05, T_BITE + 0.35, t)
    return d.lerp(hk, k).normalized()


def swim(t):
    """尾を振る位相（回）と振れ幅。追う 2Hz、突っ込む 5Hz、掛かると 4Hz で大きく"""
    def freq(x):
        if x < T_DASH:
            return 2.1
        if x < T_BITE:
            return 5.0
        return 4.0
    n = max(int(t * 200), 1)
    cyc = sum(freq(i * t / n) for i in range(n)) * t / n
    amp = 0.06 + 0.06 * sstep(T_DASH - 0.2, T_DASH, t) + 0.03 * sstep(T_BITE, T_BITE + 0.3, t)
    return cyc, amp


def cam_target(t):
    def c(x):
        body = snout(x) - heading(x) * 0.2   # 魚の体の真ん中
        return lure_now(x) * 0.4 + body * 0.6 + Vector((0, 0, 0.03))
    acc = Vector((0, 0, 0))
    for i in range(9):
        acc += c(t + (i - 4) * 0.08)
    return acc / 9


# ---------------- シーン ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
cy = sc.cycles
cy.device = "CPU"
cy.samples = SAMPLES
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.use_denoising = True
try:
    cy.denoiser = "OPENIMAGEDENOISE"
except Exception:
    pass
cy.max_bounces = 6
cy.diffuse_bounces = 2
cy.glossy_bounces = 2
cy.transmission_bounces = 2
cy.volume_bounces = 1
cy.transparent_max_bounces = 16
cy.caustics_reflective = False
cy.caustics_refractive = False
sc.render.resolution_x, sc.render.resolution_y = RES
sc.render.resolution_percentage = 100
sc.render.fps = FPS
sc.render.image_settings.file_format = "PNG"
try:
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
sc.view_settings.exposure = 0.55


def mat(name, build):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    build(nt, nt.nodes, nt.links)
    return m


def principled(nt):
    return nt.nodes.get("Principled BSDF")


# 世界：深い青
world = bpy.data.worlds.new("sea")
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.012, 0.05, 0.075, 1)
bg.inputs["Strength"].default_value = 1.0

# 水：散乱（光の筋）と吸収（青くかすむ）
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 6.75))
water = bpy.context.object
water.name = "water"
water.scale = (60, 60, 14.5)


def b_water(nt, n, l):
    for x in list(n):
        n.remove(x)
    out = n.new("ShaderNodeOutputMaterial")
    sca = n.new("ShaderNodeVolumeScatter")
    sca.inputs["Color"].default_value = (0.55, 0.85, 0.95, 1)
    sca.inputs["Density"].default_value = 0.055
    sca.inputs["Anisotropy"].default_value = 0.72
    ab = n.new("ShaderNodeVolumeAbsorption")
    ab.inputs["Color"].default_value = (0.22, 0.62, 0.78, 1)
    ab.inputs["Density"].default_value = 0.09
    add = n.new("ShaderNodeAddShader")
    l.new(sca.outputs[0], add.inputs[0])
    l.new(ab.outputs[0], add.inputs[1])
    l.new(add.outputs[0], out.inputs["Volume"])


water.data.materials.append(mat("water", b_water))

# 日光と、水面のゆらぎの影（コースティクスと光の筋になる）
bpy.ops.object.light_add(type="SUN", location=(0, 0, 20))
sun = bpy.context.object
sun.data.energy = 12.0
sun.data.angle = math.radians(0.6)
sun.rotation_euler = (math.radians(12), math.radians(-8), 0)

bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 14.3))
gobo = bpy.context.object
gobo.name = "surface_gobo"
for vis in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
    setattr(gobo, vis, False)

GOBO_W = None


def b_gobo(nt, n, l):
    global GOBO_W
    for x in list(n):
        n.remove(x)
    out = n.new("ShaderNodeOutputMaterial")
    tc = n.new("ShaderNodeTexCoord")
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 0.8
    vm = n.new("ShaderNodeVectorMath")
    vm.operation = "MULTIPLY_ADD"
    vm.inputs[1].default_value = (0.25, 0.25, 0.25)
    l.new(noi.outputs["Color"], vm.inputs[0])
    l.new(tc.outputs["Object"], vm.inputs[2])
    l.new(tc.outputs["Object"], noi.inputs["Vector"])
    vor = n.new("ShaderNodeTexVoronoi")
    vor.voronoi_dimensions = "4D"
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 1.8
    l.new(vm.outputs[0], vor.inputs["Vector"])
    GOBO_W = vor.inputs["W"]
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = 0.09
    ramp.color_ramp.elements[1].color = (0.75, 0.75, 0.75, 1)
    l.new(vor.outputs["Distance"], ramp.inputs["Fac"])
    big = n.new("ShaderNodeTexNoise")
    big.inputs["Scale"].default_value = 0.22
    big.inputs["Detail"].default_value = 1.0
    l.new(tc.outputs["Object"], big.inputs["Vector"])
    br = n.new("ShaderNodeMapRange")
    br.inputs["From Min"].default_value = 0.42
    br.inputs["From Max"].default_value = 0.6
    br.inputs["To Min"].default_value = 0.55
    br.inputs["To Max"].default_value = 0.0
    l.new(big.outputs["Fac"], br.inputs["Value"])
    mx2 = n.new("ShaderNodeMath")
    mx2.operation = "MAXIMUM"
    mx2.use_clamp = True
    l.new(ramp.outputs["Color"], mx2.inputs[0])
    l.new(br.outputs["Result"], mx2.inputs[1])
    tr = n.new("ShaderNodeBsdfTransparent")
    blk = n.new("ShaderNodeBsdfDiffuse")
    blk.inputs["Color"].default_value = (0, 0, 0, 1)
    mix = n.new("ShaderNodeMixShader")
    l.new(mx2.outputs[0], mix.inputs["Fac"])
    l.new(tr.outputs[0], mix.inputs[1])
    l.new(blk.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs["Surface"])


gobo.data.materials.append(mat("gobo", b_gobo))

# 海底：砂（ゆるい起伏と砂紋）
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
sand = bpy.context.object
sand.name = "sand"
sub = sand.modifiers.new("sub", "SUBSURF")
sub.subdivision_type = "SIMPLE"
sub.levels = sub.render_levels = 7
tex = bpy.data.textures.new("dune", "CLOUDS")
tex.noise_scale = 1.6
dis = sand.modifiers.new("disp", "DISPLACE")
dis.texture = tex
dis.strength = 0.06
dis.mid_level = 0.5
sand.location.z = -0.03


def b_sand(nt, n, l):
    p = principled(nt)
    tc = n.new("ShaderNodeTexCoord")
    wav = n.new("ShaderNodeTexWave")
    wav.inputs["Scale"].default_value = 3.2
    wav.inputs["Distortion"].default_value = 6.0
    wav.inputs["Detail"].default_value = 2.0
    l.new(tc.outputs["Object"], wav.inputs["Vector"])
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 140.0
    noi.inputs["Detail"].default_value = 8.0
    l.new(tc.outputs["Object"], noi.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.30, 0.27, 0.20, 1)
    ramp.color_ramp.elements[1].color = (0.62, 0.57, 0.44, 1)
    l.new(noi.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.95
    mx = n.new("ShaderNodeMath")
    mx.operation = "ADD"
    l.new(wav.outputs["Fac"], mx.inputs[0])
    l.new(noi.outputs["Fac"], mx.inputs[1])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.01
    l.new(mx.outputs[0], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], p.inputs["Normal"])


sand.data.materials.append(mat("sand", b_sand))

# 遠くの岩（魚の通り道からは離す）
def b_rock(nt, n, l):
    p = principled(nt)
    p.inputs["Base Color"].default_value = (0.13, 0.13, 0.11, 1)
    p.inputs["Roughness"].default_value = 0.9
    noi = n.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 12
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    l.new(noi.outputs["Fac"], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], p.inputs["Normal"])


rockm = mat("rock", b_rock)
for i, (x, y, s) in enumerate([(-3.5, 5.0, 1.1), (2.5, 6.5, 1.6), (5.5, 4.0, 0.8), (-6.0, 8.0, 2.0), (0.5, 9.5, 1.3)]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=s, location=(x, y, s * 0.15))
    r = bpy.context.object
    r.scale = (1.0, 0.8, 0.55)
    t2 = bpy.data.textures.new(f"rk{i}", "VORONOI")
    t2.noise_scale = 0.5
    d2 = r.modifiers.new("d", "DISPLACE")
    d2.texture = t2
    d2.strength = 0.35 * s
    r.data.materials.append(rockm)

# マリンスノー（漂う粒）：点に小さな球を並べる
rng = np.random.default_rng(7)
pts = np.column_stack([rng.uniform(-3, 3, 2600), rng.uniform(-2.5, 3.5, 2600), rng.uniform(0.05, 7.5, 2600)])
me = bpy.data.meshes.new("snowpts")
me.from_pydata([tuple(p) for p in pts], [], [])
snow = bpy.data.objects.new("snow", me)
sc.collection.objects.link(snow)
snow.instance_type = "VERTS"
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.0035)
flake = bpy.context.object
flake.parent = snow


def b_flake(nt, n, l):
    p = principled(nt)
    p.inputs["Base Color"].default_value = (0.8, 0.85, 0.8, 1)
    p.inputs["Roughness"].default_value = 0.6
    p.inputs["Alpha"].default_value = 0.55


flake.data.materials.append(mat("flake", b_flake))

# マダイ（Fish Kit madai.glb、CC0）
bpy.ops.import_scene.gltf(filepath=FISH)
fish = [o for o in bpy.context.selected_objects if o.type == "MESH"][0]
for o in bpy.context.selected_objects:
    if o is not fish and o.type != "MESH":
        pass
fish.parent = None
fish.rotation_mode = "QUATERNION"
V0 = np.zeros(len(fish.data.vertices) * 3)
fish.data.vertices.foreach_get("co", V0)
V0 = V0.reshape(-1, 3)
ext = V0.max(0) - V0.min(0)
AX_LEN = int(np.argmax(ext))
AX_SIDE = int(np.argmin(ext))
SNOUT = float(V0[:, AX_LEN].max())
LEN_M = float(ext[AX_LEN])
print("fish extents", ext, "len axis", AX_LEN, "side axis", AX_SIDE, "snout", SNOUT)
for m in fish.data.materials:
    p = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
    if p:
        p.inputs["Roughness"].default_value = 0.32
        try:
            p.inputs["Coat Weight"].default_value = 0.35
            p.inputs["Coat Roughness"].default_value = 0.15
        except KeyError:
            pass


def place_fish(t):
    cyc, amp = swim(t)
    s = (SNOUT - V0[:, AX_LEN]) / LEN_M
    A = 0.10 + 0.90 * s * s
    V = V0.copy()
    V[:, AX_SIDE] += LEN_M * amp * A * np.sin(2 * np.pi * (s / 1.05 - cyc))
    fish.data.vertices.foreach_set("co", V.ravel())
    fish.data.update()
    d = heading(t)
    q = d.to_track_quat("X", "Z")
    fish.rotation_quaternion = q
    nose = Vector((0, 0, 0))
    nose[AX_LEN] = SNOUT
    fish.location = snout(t) - q @ nose


# タイラバ：ヘッド・スカート・ネクタイ・ハリ・道糸
def b_head(nt, n, l):
    p = principled(nt)
    p.inputs["Base Color"].default_value = (0.85, 0.12, 0.03, 1)
    p.inputs["Metallic"].default_value = 0.5
    p.inputs["Roughness"].default_value = 0.22
    try:
        p.inputs["Coat Weight"].default_value = 1.0
    except KeyError:
        pass


def b_rubber(col, sub=0.4):
    def f(nt, n, l):
        p = principled(nt)
        p.inputs["Base Color"].default_value = col
        p.inputs["Roughness"].default_value = 0.35
        try:
            p.inputs["Subsurface Weight"].default_value = sub
            p.inputs["Subsurface Radius"].default_value = (0.004, 0.002, 0.001)
        except KeyError:
            pass
    return f


def b_line(nt, n, l):
    p = principled(nt)
    p.inputs["Base Color"].default_value = (0.9, 0.85, 0.2, 1)
    try:
        p.inputs["Emission Color"].default_value = (0.9, 0.85, 0.2, 1)
        p.inputs["Emission Strength"].default_value = 0.6
    except KeyError:
        pass


def b_hook(nt, n, l):
    p = principled(nt)
    p.inputs["Base Color"].default_value = (0.15, 0.15, 0.17, 1)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.25


bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.016)
head = bpy.context.object
bpy.ops.object.shade_smooth()
head.data.materials.append(mat("head", b_head))
for sx in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.0045)
    e = bpy.context.object
    e.scale = (1, 1, 0.35)
    e.parent = head
    e.location = (0.0, sx * 0.0145, 0.003)
    e.rotation_euler = (math.radians(90), 0, 0)
    e.data.materials.append(mat("eye", lambda nt, n, l: (principled(nt).inputs["Base Color"].__setattr__("default_value", (0.95, 0.85, 0.1, 1)), principled(nt).inputs["Roughness"].__setattr__("default_value", 0.15))))

bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0005, depth=1.0)
line = bpy.context.object
line.data.materials.append(mat("line", b_line))


def make_curve(name, npts, bevel, m):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    cu.resolution_u = 8
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(npts - 1)
    for bp in sp.bezier_points:
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, cu)
    sc.collection.objects.link(ob)
    cu.materials.append(m)
    return ob


NSK = 26
skirt_cols = [(0.95, 0.35, 0.02, 1), (0.85, 0.08, 0.03, 1)]
skm = [mat(f"skirt{i}", b_rubber(c)) for i, c in enumerate(skirt_cols)]
skirt = [make_curve(f"sk{i}", 4, 0.0006, skm[i % 2]) for i in range(NSK)]


def make_ribbon(name, n, m):
    verts = [(0, 0, 0)] * (n * 2)
    faces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(n - 1)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new(name, me)
    sc.collection.objects.link(ob)
    me.materials.append(m)
    sol = ob.modifiers.new("s", "SOLIDIFY")
    sol.thickness = 0.0008
    return ob


NR = 28
tiem = mat("tie", b_rubber((0.9, 0.06, 0.04, 1), 0.5))
ties = [make_ribbon(f"tie{i}", NR, tiem) for i in range(2)]
hookm = mat("hook", b_hook)
hooks = [make_curve(f"hook{i}", 4, 0.0007, hookm) for i in range(2)]


def place_lure(t):
    L = lure_now(t)
    hooked = t >= T_BITE
    up = Vector((0, 0, 1))
    if hooked:
        d = heading(t)
        back = (-d).lerp(Vector((0, 0, -1)), 0.3).normalized()
    else:
        back = Vector((0, 0, -1))
    head.location = L
    head.rotation_euler = (0, 0, 0.3 * math.sin(1.4 * t))
    top = L + Vector((0, 0, 0.016))
    line.location = top + up * 6.0
    line.scale = (1, 1, 12.0)
    # 左右・前後の基準
    side = back.cross(Vector((1, 0, 0)))
    if side.length < 1e-3:
        side = back.cross(Vector((0, 1, 0)))
    side.normalize()
    side2 = back.cross(side).normalized()
    knot = L + back * 0.018
    for i, ob in enumerate(skirt):
        th = 2 * math.pi * i / NSK + 0.1 * math.sin(i * 7.3)
        radial = side * math.cos(th) + side2 * math.sin(th)
        ln = 0.075 + 0.012 * math.sin(i * 3.7)
        pts = ob.data.splines[0].bezier_points
        for j, bp in enumerate(pts):
            s = j / (len(pts) - 1)
            w = 0.004 * s * math.sin(2 * math.pi * (3.1 * t - 1.4 * s) + i)
            bp.co = knot + back * (ln * s) + radial * (0.004 + 0.016 * s + w)
    for k, ob in enumerate(ties):
        sgn = -1 if k == 0 else 1
        n = NR
        co = []
        for j in range(n):
            s = j / (n - 1)
            ln = 0.11 + 0.01 * k
            # カーリー：先へ行くほど大きくうねる（水の抵抗で）。波は根元から先へ流れる
            lat = (0.003 + 0.016 * s * s) * math.sin(2 * math.pi * (2.2 * s - 3.4 * t) + k * 1.7)
            curl = 0.010 * sstep(0.75, 1.0, s) * math.sin(2 * math.pi * (5 * s - 3.4 * t))
            c = knot + back * (0.006 + ln * s) + side * (sgn * 0.006 + lat) + side2 * (0.004 * sgn + curl)
            wv = side2 * (0.0042 if s < 0.85 else 0.0042 * (1 - (s - 0.85) / 0.15 * 0.6))
            co += [c - wv, c + wv]
        ob.data.vertices.foreach_set("co", np.array([tuple(v) for v in co]).ravel())
        ob.data.update()
    for k, ob in enumerate(hooks):
        sgn = -1 if k == 0 else 1
        base = knot + back * 0.028 + side * (sgn * 0.004)
        pts = ob.data.splines[0].bezier_points
        shape = [(0, 0), (0.016, 0), (0.022, 0.007), (0.014, 0.010)]
        for j, bp in enumerate(pts):
            a, b = shape[j]
            bp.co = base + back * a + side * (sgn * b)


# カメラ（横から少し見上げる）。ピントは魚の口先
cam_d = bpy.data.cameras.new("cam")
cam_d.lens = 40
cam_d.dof.use_dof = True
cam_d.dof.aperture_fstop = 2.2
cam = bpy.data.objects.new("cam", cam_d)
sc.collection.objects.link(cam)
sc.camera = cam


def place_cam(t):
    C = cam_target(t)
    # 魚とタイラバが離れているときは引いて、両方が入るようにする
    sep = sum(((lure_now(t + (i - 4) * 0.08) - snout(t + (i - 4) * 0.08)).length for i in range(9))) / 9
    k = 1.0 + 0.55 * sep
    P = C + Vector((0.30, -1.6, -0.30)) * k
    P.z = max(P.z, 0.14)
    cam.location = P
    cam.rotation_euler = (C - P).to_track_quat("-Z", "Y").to_euler()
    cam_d.dof.focus_distance = (snout(t) - P).length


def place_all(t):
    GOBO_W.default_value = 0.55 * t
    snow.location = (0.004 * t, 0.002 * t, -0.012 * t)
    place_fish(t)
    place_lure(t)
    place_cam(t)


# ---------------- 書き出し ----------------
clr = []
for f in FRAMES:
    t = (f - 1) / FPS
    sc.frame_set(f)
    place_all(t)
    # 魚の下端と海底のすきま（埋まっていないか）
    dg = bpy.context.evaluated_depsgraph_get()
    zmin = min((fish.matrix_world @ v.co).z for v in fish.data.vertices)
    clr.append(zmin)
    t0 = time.time()
    sc.render.filepath = os.path.join(OUT, f"f{f:04d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"frame {f} t={t:.2f}s {time.time() - t0:.1f}s fishzmin={zmin:.3f}", flush=True)
    with open(os.path.join(OUT, f"timing-{FRAMES[0]:04d}.txt"), "a") as fp:
        fp.write(f"{f}\t{time.time() - t0:.1f}\t{zmin:.3f}\n")
print("min fish clearance over frames:", min(clr))
