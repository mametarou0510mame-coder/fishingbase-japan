# Fish Kit

> This kit has the **saltwater fish**. The freshwater fish are in `freshwater-fish-kit.zip`.
> この zip は**海水魚**です。淡水魚は `freshwater-fish-kit.zip` にあります。

写真から作った魚の 3D モデルと、泳ぐ・暴れる・跳ねるなどの動き（three.js 用）です。CC0 1.0 で、改変・再配布・商用利用が自由です。
使い方は、この README をあなたの AI エージェントに読ませて「このプロジェクトに魚を泳がせて」と頼んでください。

Photo-based 3D fish models with swimming and fighting motion for three.js. CC0 1.0 (public domain).

three.js is a separate library (MIT License, © three.js authors) and is not covered by CC0, and it is not included in this kit: `fish-kit.js` imports your own copy, and `example.html` loads it from cdn.jsdelivr.net. See `LICENSE.txt`.

| | |
|---|---|
| `example.html`, `example.js` | The example page: every fish and motion, built with `fish-kit.js`. Open it over http (below). |
| `fish/` | Saltwater fish: models `<name>.glb` (~5,000 triangles), `<name>_lo.glb` (~700, for distance), and head photos `<name>_head.webp` / `_cover.webp` used when the mouth and gill covers open. Freshwater fish: photos only (`<name>_body.webp`, `_bump`, `_eye`, `_mask`, and `_fins` / `_pect` for pale chub); `fish-kit.js` builds their shape in code. |
| `fish-kit.js` | Loads the models and drives the motion (ES module, three.js r187). |
| `making/` | How to make a new fish the same way. |

## View the example / 見本を見る

`example.html` reads `example.js`, `fish-kit.js` and the files next to it, so open it over http, not by double-clicking (browsers block that for `file://`; the page then shows how). For example, in this folder:

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
  import { loadFish, createFish } from './fish-kit.js';

  // ...renderer, scene, camera and lights...
  await loadFish('./fish/', ['madai']);   // omit the list to load every fish
  const fish = createFish('madai');       // typical size; createFish('madai', 40) for 40 cm
  scene.add(fish.object);
  fish.setMotion('swim');

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    fish.update(clock.getDelta());
    renderer.render(scene, camera);
  });
</script>
```

The fish faces +Z with its back up, centred on the body, in metres. `fish.object.rotation.y = -Math.PI / 2` makes it face left.

## API

- `loadFish(folder, ids?)`: loads the models.
- `createFish(id, lengthCm?)`: returns a fish. Each call makes a new one.
- `fish.object`: the three.js object to add to the scene.
- `fish.update(dt)`: call every frame.
- `fish.setMotion(id)`: changes the motion smoothly.
- `fish.drive = { speed, turnRate }`: makes the body swim at that speed (m/s) and turn rate (rad/s). Moving `fish.object` forward by `fish.currentSpeed` is up to you.
- `fish.getMouth()`: returns the mouth position, for attaching a line.
- `fish.dispose()`: removes the fish.
- `FISH`: the list of fish (id, Japanese / English name, size).
- `MOTIONS`: the list of motions.

Fish ids (each zip has only its own fish):

- Saltwater (`saltwater-fish-kit.zip`): `aji` `seabass` `mebaru` `kasago` `saba` `tachiuo` `sawara` `kamasu` `buri` `hiramasa` `kihada` `magochi` `kurodai` `madai` `katakuchi` `isaki` `isaki_young` `onagagure` `kuchibuto` `shibudai`
- Freshwater (`freshwater-fish-kit.zip`): `cardinal` (cardinal tetra), `discus_blue` `discus_red` `discus_turq` (discus), `oikawa_male` `oikawa_female` (pale chub)

Motions: `swim` (cruise), `power` (full speed), `turn`, `hover`, `range` (opens mouth, gills and fins), `bite` (head shakes), `hooked` (fighting), `tired` (on its side), `air` (out of the water), `landed` (flopping on the floor).

## Other engines

There are no animation clips. All motion is computed in the shader inside `fish-kit.js`, which you can port. Used without the kit, the saltwater glb files are ordinary textured meshes: use alpha clip and double-sided. The freshwater fish have no glb; their shape is built in `fish-kit.js` too, so port that code.
