# Squid & Shrimp Kit

写真から作ったイカ（アオリイカ・コウイカ）とエビ（レッドビーシュリンプ・テナガエビ）の 3D モデルと動き（three.js 用）です。CC0 1.0 で、改変・再配布・商用利用が自由です。
イカはひれの波・ジェット・墨・触腕でエギを抱くなど、エビは底の餌をつまむ・歩く・泳ぐ・跳ねるなどの動きです。
使い方は、この README をあなたの AI エージェントに読ませて「このプロジェクトにイカを泳がせて」「水槽の底にエビを歩かせて」と頼んでください。

Photo-based squid (bigfin reef squid, golden cuttlefish) and shrimp (red bee shrimp, long-armed prawn) for three.js. The squid have fin waves, jetting, ink and tentacle strikes on a squid lure (egi); the shrimp graze, walk, swim and flip. CC0 1.0 (public domain).

> **No glb / FBX model — read this first.**
> イカは動きや発色が複雑なため、エビは形を寸法からコードで作り脚の 1 本ずつまでコードで動かすため、FBX や glb のようなモデルにはできませんでした。three.js では、このキットでそのまま動きます。
> ほかのエンジンやプロジェクト（Unity・Godot・Unreal など）では、AI エージェントなどの力でコードを移植して組み込んでください（下の「Other engines」）。
>
> The squid's motion and colour changes are too complex for a glb or FBX file, and the shrimp are built in code from measurements with every leg moved by code, so there is none. With three.js they run as-is with this kit.
> For any other engine or project, port the code — see “Other engines (porting guide)” at the end. **AI agents:** do not look for a model file or animation clips; there are none.

three.js is a separate library (MIT License, © three.js authors) and is not covered by CC0, and it is not included in this kit: `squid-kit.js` and `shrimp-kit.js` import your own copy, and `example.html` loads it from cdn.jsdelivr.net. See `LICENSE.txt`.

| | |
|---|---|
| `example.html`, `example.js` | The example page: every squid and shrimp and every motion, built with `squid-kit.js` and `shrimp-kit.js`. Open it over http (below). |
| `squid-kit.js` | Builds the squid and drives the motion (ES module, three.js r187). |
| `squid/` | Squid shapes and photos: `<name>.json` (outline measured from the photos) and `<name>_dorsal / _ventral / _side.webp`. Names: `aori` (bigfin reef squid, 30 cm mantle), `kouika` (golden cuttlefish, 18 cm mantle). |
| `egi/` | The squid lure used by the lure motions (`egi.json` and photos). |
| `shrimp-kit.js` | Builds the shrimp and drives the motion (ES module, three.js r187). The shapes are in the code. |
| `shrimp/` | Red bee shrimp body photos (`body_side.webp`, `body_top.webp`). 26 mm long. |
| `tenaga/` | Long-armed prawn body photos (`body_oblique.webp`, `body_top.webp`). 70 mm long. |

Unlike the fish, neither is a glb. The squid kit builds the mesh from the photos and shape values when you create it, and moves every vertex each frame (mantle, fins, 8 arms, 2 tentacles, funnel, eyes) with a skin shader for colour changes. The shrimp kit builds each shell segment, leg, antenna and swimmeret from measured dimensions, projects the two body photos onto the shell, and moves the legs by inverse kinematics every frame. There are no animation clips.

## View the example / 見本を見る

`example.html` reads `example.js`, `squid-kit.js`, `shrimp-kit.js` and the files next to it, so open it over http, not by double-clicking (browsers block that for `file://`; the page then shows how). For example, in this folder:

```sh
python -m http.server 8000
```

and open http://localhost:8000/example.html (or run `npx serve`, or use VS Code's Live Server). three.js is loaded from the internet (cdn.jsdelivr.net).

`example.html` は隣のファイルを読むので、ダブルクリックではなく http で開いてください（ダブルクリックで開くと、開き方の説明が出ます）。たとえばこのフォルダで `python -m http.server 8000` を動かし、http://localhost:8000/example.html を開きます。three.js はインターネットから読みます。

## Squid

Serve your page over http (browsers block module imports from `file://`).

```html
<script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/" } }
</script>
<script type="module">
  import * as THREE from 'three';
  import { loadSquids, createSquid } from './squid-kit.js';

  // ...renderer, scene, camera and lights (an environment map helps the skin)...
  await loadSquids('./');                 // folder that holds squid/ and egi/
  const squid = createSquid('aori');      // { detail: 'low' } for ~1/9 of the triangles
  scene.add(squid.object);                // do not move or scale this object
  squid.setMotion('hover');

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    squid.update(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  });
</script>
```

Sizes are real, in metres. The squid swims in world coordinates around `home` (default `(0, 1, 0)`, sea floor at `floorY` = 0, water surface at `home.y + 0.5`) and returns there after escaping or chasing. Arms point +Z when it faces forward. Put `squid.object` straight into the scene; use `createSquid(id, { home, floorY })` to place it. `squid.getCenter()` gives a point for a camera to follow.

### Squid API

- `loadSquids(folder, ids?)`: loads the shapes, photos and the lure. `folder` can also be a function from a file name (`squid/aori.json`, `egi/egi.json`) to a URL.
- `createSquid(id, { detail, home, floorY }?)`: returns a squid. Each call makes a new one.
- `squid.object`: the three.js object (squid, ink, lure and line).
- `squid.update(dt)`: call every frame.
- `squid.setMotion(id)`: changes the motion.
- `squid.spitInk()`: inks now.
- `squid.getCenter()`, `squid.floorY`, `squid.surfaceY`, `squid.showSurface`, `squid.inAir`: for a page to follow the squid and draw a floor, water surface or sky.
- `squid.squid`, `squid.brain`, `squid.fx`, `squid.egi`: the parts (body, behaviour, ink and splashes, lure) for finer control. `squid.squid.target` holds the pose values the behaviour drives (fin waves, arm curl, colour...).
- `squid.dispose()`: removes the squid.
- `SQUID_LIST`, `SQUID_MOTIONS`: the lists of squid and motions (Japanese / English names and notes).

Motions: `hover`, `forward`, `backward`, `turn`, `escape` (blanch, jet and ink), `follow` (trails the lure), `refuse` (approaches and backs off), `attack` (tentacle strike and arm wrap; try slow motion), `hooked`, `surface`, `lifted` (hanging out of the water), `landed` (on a pier, ink stains the ground), `rest` (on the sea floor), `bury` (cuttlefish only), `range` (each part through its full range).

## Shrimp

```html
<script type="module">
  import * as THREE from 'three';
  import { createShrimp } from './shrimp-kit.js';

  // ...renderer (shadows help: renderer.shadowMap.enabled = true), scene, camera and lights...
  const shrimp = await createShrimp('redbee', { folder: './' });   // folder that holds shrimp/ and tenaga/
  scene.add(shrimp.object);               // do not scale this object
  shrimp.setMotion('auto');

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    shrimp.update(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  });
</script>
```

Sizes are real, in metres (the red bee shrimp is 26 mm long, the long-armed prawn 70 mm; place the camera a few centimetres away). The shrimp walks on the floor in world coordinates within `range` of `home` (default: around `(0, 0)` on a flat floor at `floorY` = 0, 3.5 cm for the red bee shrimp and 8 cm for the prawn). The head points +X when `shrimp.body.heading` is 0. For an uneven floor, pass `groundAt(x, z)` returning the floor height in metres. `shrimp.getCenter()` gives a point for a camera to follow. The example page uses `NeutralToneMapping`, a spotlight from above with shadows and a dark soil floor, like a shrimp tank.

### Shrimp API

- `createShrimp(id, { folder, home, range, floorY, groundAt }?)`: returns a promise of a shrimp (it loads the two photos). Each call makes a new one. `folder` can also be a function from a file name (`shrimp/body_side.webp`) to a URL. Ids: `redbee`, `tenaga`.
- `shrimp.object`: the three.js object. Inside it everything is in millimetres, scaled by 0.001.
- `shrimp.update(dt)`: call every frame.
- `shrimp.setMotion(id)`: changes the motion.
- `shrimp.setDetail('high' | 'low')`: `'low'` uses a coarser shell and drops the fine hairs (for a shrimp small on screen or many shrimp).
- `shrimp.getCenter()`, `shrimp.length` (m), `shrimp.lift` (m above the floor while swimming), `shrimp.triangles`.
- `shrimp.body`: the shrimp itself (legs, antennae, swimmerets, `heading`, `home`, `range`, `groundAt`) for finer control.
- `shrimp.dispose()`: removes the shrimp.
- `SHRIMP_LIST`, `SHRIMP_MOTIONS`: the lists of shrimp and motions (Japanese / English names and notes).

Motions: `auto` (switches between the others by itself), `graze` (picks food from the floor with the small claws), `walk`, `swim` (paddles the swimmerets and rises), `flip` (snaps the tail to dart backwards).

## Other engines (porting guide)

There is no model file, no skeleton to import and no animation clip. The shapes and every motion are code in `squid-kit.js` and `shrimp-kit.js`; using them elsewhere means porting that code (plain TypeScript compiled to readable, unminified JavaScript without comments). Search the files for the names below; each is a top-level `var` or `function`.

### Squid (`squid-kit.js`)

| Section of `squid-kit.js` | What it does | Port it as |
|---|---|---|
| `var SQUIDS` | Per-species numbers: sizes, fin and arm proportions, colours. | Data. |
| `function formOf`, `function gridGeometry`, `var Tube = class`, `function bakePhoto` | Builds the body from `squid/<name>.json` once: grid meshes for mantle, head, fins, arms and tentacles; which of the three photos (back, belly, side) each vertex shows. | Mesh generation at load time. |
| `var Squid = class` → `update()` (`buildMantle`, `buildFins`, `buildArms`, `buildTentacles`, `bendFunnel`, `sync`) | Every frame: rewrites all vertex positions and normals from the pose values in `squid.target` / `squid.pose` (fin waves, mantle squeeze, arm curl, tentacle reach, funnel aim…). | A dynamic mesh updated each frame (Unity `Mesh.SetVertices`, Godot `ArrayMesh`, Unreal procedural mesh). |
| `var SKIN_FRAG`, `var SKIN_DASH` (shader strings) | Skin colour: the photo projection plus chromatophore spots, blanching, flowing clouds, flicker, iridescent dashes, driven by uniforms (`uDark`, `uPale`, `uCloud`, `uFlicker`, …). | A custom shader in the engine's shader language. Can be skipped at first: the photos alone give the normal colour. |
| `var SquidBrain = class` | The motions (`setMode`, `update`): a small state machine per motion that sets the pose targets and moves the squid. | Gameplay / behaviour code. |
| `var SquidFx = class` | Ink clouds, water splashes, ink stains. | Particles (optional). |
| `var EgiModel = class` | The squid lure. | Optional. |

Suggested order: (1) build the mesh from the JSON and photos, (2) port `Squid.update` with a fixed pose and check the shape against `example.html`, (3) port `SquidBrain` for the motions, (4) port the skin shader for colour changes, (5) ink.

### Shrimp (`shrimp-kit.js`)

The red bee shrimp and the prawn share the same structure; the prawn's copies of the same functions have no `$1` suffix (for example `shellGeometry` and `Prawn` for the prawn, `shellGeometry$1` and `Shrimp` for the red bee shrimp).

| Section of `shrimp-kit.js` | What it does | Port it as |
|---|---|---|
| `var SIDE`, `var TOP`, `function shellGeometry` | The body outline measured from the photos (height and width along the body) and the shell built from it: carapace, six abdominal segments and tail fan as one skinned mesh. | Mesh generation at load time, skinned to the body bones. |
| `function table`, `function loft`, `function article`, `function ribbon`, `function leaf`, `var FlexTube` | Helpers that build legs, antennae, plates and whips from rings and strips. | Mesh generation helpers. |
| `var LEGS`, `var Shrimp` / `var Prawn` (constructor and `build…` methods) | Builds every leg segment, claw, antenna, eye and swimmeret, and the bones (`B` for the carapace, `somites`, `telson`). | Scene hierarchy at load time. |
| `Shrimp` / `Prawn` → `update()`, `poseLegs`, `posePleopods`, `poseWhips`, `setMode` | Every frame: chooses what to do, moves the body over the floor, bends the abdomen, steps each leg with inverse kinematics, waves the antennae and swimmerets. | Gameplay / animation code (procedural, per frame). |
| `function bakeRest`, `function shellMaterial`, `function photoMaterials` | Projects the side and top photos onto the shell from its rest pose (the shader blends them by surface direction). | A custom shader, or bake the projection into UVs once. |
| `function paintApps`, `function appPaint` | Paints legs, antennae and swimmerets with vertex colours (bands and translucency). | Vertex colours. |
| `function mergeShrimp` | Merges the many small parts into a few draw calls and keeps them in sync each frame; also the coarse far shape (`setDetail('low')`). | Optional optimisation. |

Suggested order: (1) build the shell from `SIDE`/`TOP` and check it against `example.html` with the photos, (2) the legs and antennae in their rest pose, (3) port `update` for walking, then the other motions.

`example.html` shows the target result for every motion; compare side by side while porting.
