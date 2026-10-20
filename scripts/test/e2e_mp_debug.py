# MediaPipe の対話型セグメンテーションの呼び出し方を確かめる
from playwright.sync_api import sync_playwright
SITE = "https://tsuredoki-kansai.mametarou0510mame.workers.dev"
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
  const img = new Image(); img.src = "/og/guide-sabiki.png"; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0);
  out.push("statics: " + Object.getOwnPropertyNames(mod.InteractiveSegmenter).join(","));
  out.push("allexports: " + Object.keys(mod).join(","));
  const mk = (bm) => () => [{ brushMode: bm, point: [{ x: 0.5, y: 0.5 }], isCompleted: true }];
  const tries = [
    ["num0", c, mk(0)], ["num1", c, mk(1)], ["str", c, mk("POSITIVE")],
    ["static", c, mk((mod.InteractiveSegmenter.BrushMode || {}).POSITIVE)],
    ["nomode", c, () => [{ point: [{ x: 0.5, y: 0.5 }], isCompleted: true }]],
  ];
  for (const [name, im, st] of tries) {
    try {
      seg.setImage(im);
      const m = seg.segment(st());
      const desc = m ? Object.getOwnPropertyNames(Object.getPrototypeOf(m)).join(",") : "null";
      let stat = "";
      if (m && m.getAsFloat32Array) { const a = m.getAsFloat32Array(); let n = 0; for (const v of a) if (v > 0.5) n++; stat = `w=${m.width} h=${m.height} fg=${(n/a.length).toFixed(3)}`; }
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
        for line in pg.evaluate(JS):
            print(f"::notice::{line}")
    except Exception as e:
        print(f"::notice::eval error {str(e)[:500]}")
    for l in logs[-6:]:
        print(f"::notice::log {l[:600]}")
    b.close()
