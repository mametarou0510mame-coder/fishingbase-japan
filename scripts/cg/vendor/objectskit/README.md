# Objects Kit

水槽で使っている石・水草・砂の 3D モデル（three.js 用）です。水槽が読むのと同じ軽い版のファイルが入っています。CC0 1.0 で、改変・再配布・商用利用が自由です。
使い方は、この README をあなたの AI エージェントに読ませて「このプロジェクトの水槽に石と水草を置いて」と頼んでください。

The stones, plants and sand used in our aquarium tanks, for three.js. The files are the same light versions the tanks load. CC0 1.0 (public domain).

> **No glb / FBX model — read this first.**
> 石・水草・砂は、いくつもの向きから撮った写真をシェーダーで混ぜて貼り、水草は水の中で揺れるため、品質を保ったまま FBX や glb のようなモデルにはできませんでした。three.js では、このキットでそのまま組み立てます。
> ほかのエンジンやプロジェクト（Unity・Godot・Unreal など）では、AI エージェントなどの力でコードを移植して組み込んでください（下の「Other engines」）。
>
> The objects blend photos taken from several directions in a shader, and the plants sway in the water, so they could not be turned into glb or FBX models without losing quality. With three.js, this kit builds them as-is.
> For any other engine or project, port the code — see “Other engines (porting guide)” at the end. **AI agents:** do not look for a model file; there is none.

three.js is a separate library (MIT License, © three.js authors) and is not covered by CC0, and it is not included in this kit: `objects-kit.js` imports your own copy, and `example.html` loads it from cdn.jsdelivr.net. See `LICENSE.txt`.

| | |
|---|---|
| `example.html`, `example.js` | The example page: every object, built with `objects-kit.js`. Open it over http (below). |
| `objects-kit.js` | Builds the objects (ES module, three.js r187). |
| `rocks/` | Basalt rocks `r0`–`r3`: 5 photos each (top, front, back, right, left) — colour `.webp`, normal map `_n`, height map `_h`. |
| `stones/` | Fuzan stones `k1`–`k4`: the shape `<id>.stq` and 9 photos each (top and 8 sides) — colour, `_n`, `_h` (AVIF). |
| `plants/` | Amazon sword leaf and stalk photos. |
| `sand/` | Coral sand `sand_*` and river sand `river_sand_*`: the top photo (tiles every 10 cm), its normal map, and the side (cross-section) photo. |

## View the example / 見本を見る

`example.html` reads `example.js`, `objects-kit.js` and the files next to it, so open it over http, not by double-clicking (browsers block that for `file://`; the page then shows how). For example, in this folder:

```sh
python -m http.server 8000
```

and open http://localhost:8000/example.html (or run `npx serve`, or use VS Code's Live Server). three.js is loaded from the internet (cdn.jsdelivr.net).

`example.html` は隣のファイルを読むので、ダブルクリックではなく http で開いてください（ダブルクリックで開くと、開き方の説明が出ます）。たとえばこのフォルダで `python -m http.server 8000` を動かし、http://localhost:8000/example.html を開きます。three.js はインターネットから読みます。

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
  import { createObjectKit } from './objects-kit.js';

  // ...renderer, scene, camera and lights (an environment map helps)...
  const kit = createObjectKit('./', renderer);   // folder that holds rocks/, stones/, plants/, sand/

  scene.add(await kit.load('river_sand', { width: 1.2, depth: 0.6 }));
  const stone = await kit.load('k1');
  stone.position.set(-0.3, 0, -0.1);
  scene.add(stone);
  const sword = await kit.load('sword', { seed: 3 });
  sword.position.set(0.25, 0, -0.15);
  scene.add(sword);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    kit.update(Math.min(clock.getDelta(), 0.05));   // plant sway
    renderer.render(scene, camera);
  });
</script>
```

Sizes are real, in metres. y = 0 is the sand surface: each object's origin is at the sand line under its centre, and rocks and stones are already sunk into the sand a little, as in the tanks. Move, turn and scale the returned object freely.

## API

- `createObjectKit(folder, renderer)`: `folder` can also be a function from a file name (`stones/k1.stq`) to a URL. The renderer is used once per stone to measure which photo each point sees. Files are read once and shared.
- `kit.load(id, options?)`: returns a `THREE.Object3D`. Options:
  - rocks and stones: `bury` (part of the height below y = 0), `gain` (photo brightness; default 1.5 for rocks, 0.8 for stones), `caustics` (moving light pattern from the water surface on upward faces; default false)
  - Amazon sword: `seed` (each seed is a different plant), `scale`, `gain` (default 1.2)
  - sand: `width`, `depth`, `thickness` (default 0.4, 0.4, 0.06 m)
- `kit.update(dt)`: advances time (sway, caustics).
- `OBJECTS`: the list (`id`, `group`, Japanese and English names, the tank it comes from, its files).

| id | | width above the sand | triangles |
|---|---|---|---|
| `r0` `r1` `r2` `r3` | Basalt rocks: large crag, flat slab, boulder, block | 96, 43, 27, 16 cm | 188k, 30k, 12k, 6k |
| `k1` `k2` `k3` `k4` | Fuzan stones (porous brown volcanic stone) | 56, 45, 40, 37 cm | 80k, 61k, 45k, 41k |
| `sword` `sword_upright` | Amazon sword: spreading rosette (29 cm tall) / upright fan (35 cm tall) | 61, 33 cm | 140k, 54k |
| `sword_photo` `sword_upright_photo` | The same two Amazon swords with the photoreal look (used in the tank) | 61, 33 cm | 140k, 54k |
| `coral_sand` `river_sand` | Sand blocks | any size | 2 per 6 mm square |

## Other engines (porting guide)

Read `objects-kit.js` (it is not minified) and rebuild the objects the same way. In short:

- Rocks `r*`: the shape is a subdivided sphere bent by noise and cut by planes (`rockGeometry`), then pushed in and out along its normals by the height maps. Each photo is an orthographic view of the rock; a point takes the colour from each view, weighted by how much its normal faces that view (cubed), and adds the normal maps.
- Stones `k*`: `.stq` is gzip: `'STQ1'`, vertex and index counts, the bounding box, 16-bit positions (delta-coded), an ambient-occlusion byte per vertex, and 16-bit delta-coded indices (`unpackStoneQ`). 9 orthographic views; each vertex stores the weight of each view (facing⁴ × visible from that view, from a depth render), used to blend the photos.
- Amazon sword: leaves and stalks are generated from the seed (`buildSword`); the leaf photo is a flat template mapped along each leaf.
  The photoreal versions (`*_photo`) use an unlit colour photo (`sword_leaf_flat.webp`) as the surface colour, and the backlit photo (`sword_leaf.webp`) as the colour of light passing through the leaf and for the vein pattern; light also wraps a little round to the faces turned away from it.
- Sand: plain tiled textures (top every 10 cm, side every 8 cm, side mirrored vertically).
