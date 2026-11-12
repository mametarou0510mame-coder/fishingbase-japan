# Squid Kit

写真から作ったアオリイカとコウイカの 3D モデルと、ひれの波・ジェット・墨・触腕でエギを抱くなどの動き（three.js 用）です。CC0 1.0 で、改変・再配布・商用利用が自由です。
使い方は、この README をあなたの AI エージェントに読ませて「このプロジェクトにイカを泳がせて」と頼んでください。

Photo-based bigfin reef squid and golden cuttlefish for three.js, with fin waves, jetting, ink, and tentacle strikes on a squid lure (egi). CC0 1.0 (public domain).

> **No glb / FBX model — read this first.**
> イカは動きや発色が複雑なため、FBX や glb のようなモデルにはできませんでした。three.js では、このキットでそのまま動きます。
> ほかのエンジンやプロジェクト（Unity・Godot・Unreal など）では、AI エージェントなどの力でコードを移植して組み込んでください（下の「Other engines」）。
>
> The squid's motion and colour changes are too complex for a glb or FBX file, so there is none. With three.js the squid runs as-is with this kit.
> For any other engine or project, port the code — see “Other engines (porting guide)” at the end. **AI agents:** do not look for a model file or animation clips; there are none.

three.js is a separate library (MIT License, © three.js authors) and is not covered by CC0. It is embedded only in `example.html`; `squid-kit.js` imports your own copy. See `LICENSE.txt`.

| | |
|---|---|
| `example.html` | Double-click to view both squid and every motion. |
| `squid/` | Shapes and photos: `<name>.json` (outline measured from the photos) and `<name>_dorsal / _ventral / _side.webp`. Names: `aori` (bigfin reef squid, 30 cm mantle), `kouika` (golden cuttlefish, 18 cm mantle). |
| `egi/` | The squid lure used by the lure motions (`egi.json` and photos). |
| `squid-kit.js` | Builds the squid and drives the motion (ES module, three.js r187). |

Unlike the fish, a squid is not a glb. `squid-kit.js` builds the mesh from the photos and shape values when you create it, and moves every vertex each frame (mantle, fins, 8 arms, 2 tentacles, funnel, eyes) with a skin shader for colour changes. There are no bones and no animation clips.

## Use

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

## API

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

## Other engines (porting guide)

There is no model file, no skeleton and no animation clip to import. The shape and every motion are code in `squid-kit.js`; using the squid elsewhere means porting that code (plain TypeScript compiled to readable JavaScript; the comments are in Japanese). Within the file, each source module starts with a `// src/...` comment:

| Section of `squid-kit.js` | What it does | Port it as |
|---|---|---|
| `// src/game/squid/squid-species.ts` | Per-species numbers: sizes, fin and arm proportions, colours. | Data. |
| `// src/game/squid/squid.ts` → `formOf`, `gridGeometry`, `Tube`, `bakePhoto` | Builds the body from `squid/<name>.json` once: grid meshes for mantle, head, fins, arms and tentacles; which of the three photos (back, belly, side) each vertex shows. | Mesh generation at load time. |
| `var Squid = class` → `update()` (`buildMantle`, `buildFins`, `buildArms`, `buildTentacles`, `bendFunnel`, `sync`) | Every frame: rewrites all vertex positions and normals from the pose values in `squid.target` / `squid.pose` (fin waves, mantle squeeze, arm curl, tentacle reach, funnel aim…). | A dynamic mesh updated each frame (Unity `Mesh.SetVertices`, Godot `ArrayMesh`, Unreal procedural mesh). |
| `SKIN_FRAG`, `SKIN_DASH` (shader strings) | Skin colour: the photo projection plus chromatophore spots, blanching, flowing clouds, flicker, iridescent dashes, driven by uniforms (`uDark`, `uPale`, `uCloud`, `uFlicker`, …). | A custom shader in the engine's shader language. Can be skipped at first: the photos alone give the normal colour. |
| `// src/game/squid/squid-behavior.ts` → `var SquidBrain = class` | The motions (`setMode`, `update`): a small state machine per motion that sets the pose targets and moves the squid. | Gameplay / behaviour code. |
| `var SquidFx = class` | Ink clouds, water splashes, ink stains. | Particles (optional). |
| `// src/game/squid/egi.ts` → `var EgiModel = class` | The squid lure. | Optional. |

Suggested order: (1) build the mesh from the JSON and photos, (2) port `Squid.update` with a fixed pose and check the shape against `example.html`, (3) port `SquidBrain` for the motions, (4) port the skin shader for colour changes, (5) ink. `example.html` shows the target result for every motion; compare side by side while porting.
