# MediaPipe の対話型セグメンテーションの呼び出し方を確かめる
from playwright.sync_api import sync_playwright
SITE = "https://tsuredoki-kansai.mametarou0510mame.workers.dev"
import base64
IMG = base64.b64encode(open("scripts/test/fishphoto.jpg","rb").read()).decode()
JS = r"""
async () => {
  const out = [];
  const U = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1";
  const mod = await import(U + "/vision_bundle.mjs");
  out.push("exports: " + Object.keys(mod).filter(k => /Segment|Brush|Mask|Region/.test(k)).join(","));
  out.push("BrushMode: " + JSON.stringify(mod.BrushMode));
  const fs = await mod.FilesetResolver.forVisionTasks(U + "/wasm");
  const seg = await mod.InteractiveSegmenter.createFromModelPath(fs, "https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task");
  out.push("methods: " + Object.getOwnPropertyNames(Object.getPrototypeOf(seg)).join(","));
  const img = new Image(); img.src = "data:image/jpeg;base64,__IMG__"; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0);
  out.push("statics: " + Object.getOwnPropertyNames(mod.InteractiveSegmenter).join(","));
  out.push("allexports: " + Object.keys(mod).join(","));
  const mk = (bm, pts) => () => [{ brushMode: bm, point: pts || [{ x: 0.5, y: 0.52 }], isCompleted: true }];
  const tries = [
    ["pos1", c, mk(1)], ["mode2", c, mk(2)], ["mode3", c, mk(3)],
    ["two", c, () => [{ brushMode: 1, point: [{ x: 0.5, y: 0.52 }], isCompleted: true }, { brushMode: 2, point: [{ x: 0.05, y: 0.05 }], isCompleted: true }]],
  ];
  for (const [name, im, st] of tries) {
    try {
      seg.setImage(im);
      const m = seg.segment(st());
      const desc = m ? Object.getOwnPropertyNames(Object.getPrototypeOf(m)).join(",") : "null";
      let stat = "";
      if (m && m.getAsFloat32Array) { const a = m.getAsFloat32Array(); let n = 0; for (const v of a) if (v > 0.5) n++; let mn = 1e9, mx = -1e9; for (const v of a) { if (v < mn) mn = v; if (v > mx) mx = v; } const at = (x, y) => a[Math.floor(y * m.height) * m.width + Math.floor(x * m.width)]; stat = `w=${m.width} h=${m.height} fg=${(n/a.length).toFixed(3)} min=${mn} max=${mx} center=${at(0.5,0.52)} corner=${at(0.03,0.03)}`; }
      out.push(`${name}: ok ${stat} [${desc}]`);
    } catch (e) { out.push(`${name}: ERR ${String(e && e.message || e).replace(/\n/g," | ").slice(0, 600)}`); }
  }
  return out;
}
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    logs = []
    pg.on("console", lambda m: logs.append(m.text.replace("\n", " | ")))
    pg.goto(f"{SITE}/aquarium/")
    try:
        for line in pg.evaluate(JS.replace("__IMG__", IMG)):
            print(f"::notice::{line}")
    except Exception as e:
        print(f"::notice::eval error {str(e)[:500]}")
    for l in logs[-6:]:
        print(f"::notice::log {l[:600]}")
    b.close()
