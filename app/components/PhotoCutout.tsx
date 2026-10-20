"use client";

// 釣った魚の写真から、魚だけを切り抜く。
// 1) 魚をタップすると自動で選ぶ（Google の MediaPipe の画像認識モデルを、この端末の中で動かす）
// 2) うまく選べない時は、指で魚のまわりをなぞる。はみ出しは「消す」、足りない所は「足す」で直す
// 3) 魚の向きを横にそろえて切り抜き、頭が右になるように左右を選ぶ
// 写真はこの端末の中だけで処理し、どこにも送らない。
import { useCallback, useEffect, useRef, useState } from "react";

const MP_VER = "1.0.1";
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task";
const MAX = 1400; // 作業する画像の長辺

type Tool = "auto" | "autoMinus" | "lasso" | "add" | "erase";
type MPMask = { width: number; height: number; getAsFloat32Array?: () => Float32Array; getAsUint8Array?: () => Uint8Array; close?: () => void };
type Stroke = { brushMode: unknown; point: { x: number; y: number }[]; isCompleted: boolean };
type Segmenter = { setImage: (img: HTMLCanvasElement) => void; segment: (s: Stroke[]) => MPMask };
type MP = { seg: Segmenter; POS: unknown; NEG: unknown };
let mpPromise: Promise<MP> | null = null;

async function loadSegmenter(): Promise<MP> {
  if (!mpPromise) {
    mpPromise = (async () => {
      const mod = await import(/* webpackIgnore: true */ `${MP_URL}/vision_bundle.mjs`);
      const fileset = await mod.FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      const seg = await mod.InteractiveSegmenter.createFromModelPath(fileset, MODEL);
      return { seg, POS: mod.BrushMode?.POSITIVE ?? 1, NEG: mod.BrushMode?.NEGATIVE ?? 2 /* 1.0.1 では列挙が公開されていないので数値で指定 */ };
    })();
    mpPromise.catch(() => (mpPromise = null));
  }
  return mpPromise;
}

export default function PhotoCutout({ file, onDone, onCancel }: { file: File; onDone: (b: Blob) => void; onCancel: () => void }) {
  const view = useRef<HTMLCanvasElement>(null);
  const src = useRef<HTMLCanvasElement | null>(null);
  const mask = useRef<Uint8Array | null>(null);
  const lasso = useRef<{ x: number; y: number }[]>([]);
  const drawing = useRef(false);
  const [tool, setTool] = useState<Tool>("auto");
  const [msg, setMsg] = useState("写真を読み込んでいます…");
  const [busy, setBusy] = useState(false);
  const [has, setHas] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [result, setResult] = useState<HTMLCanvasElement | null>(null);
  const [flip, setFlip] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);

  const paint = useCallback(() => {
    const c = view.current, s = src.current;
    if (!c || !s) return;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(s, 0, 0);
    const m = mask.current;
    if (m) {
      const ov = ctx.createImageData(s.width, s.height);
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        ov.data[i * 4] = 40;
        ov.data[i * 4 + 1] = 220;
        ov.data[i * 4 + 2] = 255;
        ov.data[i * 4 + 3] = 110;
      }
      const t = document.createElement("canvas");
      t.width = s.width;
      t.height = s.height;
      t.getContext("2d")!.putImageData(ov, 0, 0);
      ctx.drawImage(t, 0, 0);
    }
    const pts = lasso.current;
    if (pts.length > 1) {
      ctx.strokeStyle = "#ffeb3b";
      ctx.lineWidth = Math.max(3, s.width / 250);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }, []);

  // 写真を読み込む（向きの情報も反映される）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
        const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
        const c = document.createElement("canvas");
        c.width = Math.round(bmp.width * k);
        c.height = Math.round(bmp.height * k);
        c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
        if (!alive) return;
        src.current = c;
        mask.current = new Uint8Array(c.width * c.height);
        if (view.current) {
          view.current.width = c.width;
          view.current.height = c.height;
        }
        paint();
        setMsg("魚の体をタップしてください。自動で魚を選びます。");
        loadSegmenter().catch(() => undefined); // 先に読み込みを始めておく
      } catch {
        setMsg("この写真は読み込めませんでした。JPEG・PNG・HEIC 以外の形式の場合は、別の写真でお試しください。");
      }
    })();
    return () => {
      alive = false;
    };
  }, [file, paint]);

  // 「切り抜きに戻る」で画面を作り直した時に、写真を描き直す
  useEffect(() => {
    if (step !== "select" || !view.current || !src.current) return;
    view.current.width = src.current.width;
    view.current.height = src.current.height;
    paint();
  }, [step, paint]);

  const pos = (e: React.PointerEvent) => {
    const c = view.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const brush = (p: { x: number; y: number }, on: boolean) => {
    const s = src.current!, m = mask.current!;
    const rad = Math.max(8, Math.round(s.width / 35));
    for (let y = Math.max(0, Math.floor(p.y - rad)); y < Math.min(s.height, p.y + rad); y++)
      for (let x = Math.max(0, Math.floor(p.x - rad)); x < Math.min(s.width, p.x + rad); x++)
        if ((x - p.x) ** 2 + (y - p.y) ** 2 <= rad * rad) m[y * s.width + x] = on ? 1 : 0;
  };

  // タップした点（含める点・除く点）をためて、まとめて画像認識にかける
  const points = useRef<{ x: number; y: number; neg: boolean }[]>([]);
  const imageSet = useRef(false);
  const autoSelect = async (p: { x: number; y: number }, neg: boolean) => {
    const s = src.current!;
    setBusy(true);
    setMsg("魚を探しています…（はじめての時は、画像認識の準備に少し時間がかかります）");
    await new Promise((r) => setTimeout(r, 30)); // 表示を先に更新する
    try {
      const mp = await loadSegmenter();
      if (!imageSet.current) {
        mp.seg.setImage(s);
        imageSet.current = true;
      }
      points.current.push({ x: p.x / s.width, y: p.y / s.height, neg });
      const strokes: Stroke[] = points.current.map((q) => ({ brushMode: q.neg ? mp.NEG : mp.POS, point: [{ x: q.x, y: q.y }], isCompleted: true }));
      const r = mp.seg.segment(strokes);
      const W = r.width, H = r.height;
      const f = r.getAsFloat32Array?.();
      const u = f ? null : r.getAsUint8Array?.();
      if (!f && !u) throw new Error("no mask");
      const m = mask.current!;
      for (let y = 0; y < s.height; y++)
        for (let x = 0; x < s.width; x++) {
          const k = Math.floor((y / s.height) * H) * W + Math.floor((x / s.width) * W);
          m[y * s.width + x] = (f ? f[k] > 0.5 : (u![k] ?? 0) > 127) ? 1 : 0;
        }
      r.close?.();
      setHas(m.some((v) => v));
      setMsg("水色の所が切り抜かれます。足りない所は続けてタップ、手などは「自動で除く」でタップ。細かい所は「足す」「消す」で直して「次へ」。");
    } catch {
      points.current.pop();
      setTool("lasso");
      setMsg("自動で選べませんでした（通信できない時など）。指（マウス）で魚のまわりをなぞってください。");
    } finally {
      setBusy(false);
      paint();
    }
  };

  const down = (e: React.PointerEvent) => {
    if (busy || !src.current) return;
    const p = pos(e);
    if (tool === "auto" || tool === "autoMinus") return void autoSelect(p, tool === "autoMinus");
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    if (tool === "lasso") lasso.current = [p];
    else brush(p, tool === "add");
    paint();
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pos(e);
    if (tool === "lasso") lasso.current.push(p);
    else brush(p, tool === "add");
    paint();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (tool === "lasso" && lasso.current.length > 5) {
      const s = src.current!;
      const t = document.createElement("canvas");
      t.width = s.width;
      t.height = s.height;
      const ctx = t.getContext("2d")!;
      ctx.beginPath();
      lasso.current.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      const a = ctx.getImageData(0, 0, s.width, s.height).data;
      const m = mask.current!;
      for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 127 ? 1 : 0;
      setHas(true);
      setMsg("水色の所が切り抜かれます。はみ出しは「消す」、足りない所は「足す」で直して、「次へ」を押してください。");
    }
    lasso.current = [];
    paint();
  };

  // 魚の向きを横にそろえて切り抜く
  const finish = () => {
    const s = src.current!, m = mask.current!;
    let n = 0, mx = 0, my = 0;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (m[y * s.width + x]) { n++; mx += x; my += y; }
    if (n < 200) return setMsg("魚が選ばれていません。魚をタップするか、なぞってください。");
    mx /= n;
    my /= n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++)
        if (m[y * s.width + x]) { const dx = x - mx, dy = y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); // 体の長い向き
    const mc = document.createElement("canvas");
    mc.width = s.width;
    mc.height = s.height;
    const mi = mc.getContext("2d")!.createImageData(s.width, s.height);
    for (let i = 0; i < m.length; i++) mi.data[i * 4 + 3] = m[i] ? 255 : 0;
    mc.getContext("2d")!.putImageData(mi, 0, 0);
    const D = Math.ceil(Math.hypot(s.width, s.height));
    const rot = document.createElement("canvas");
    rot.width = D;
    rot.height = D;
    const rc = rot.getContext("2d")!;
    rc.translate(D / 2, D / 2);
    rc.rotate(-ang);
    rc.translate(-mx, -my);
    rc.drawImage(s, 0, 0);
    rc.setTransform(1, 0, 0, 1, 0, 0);
    rc.globalCompositeOperation = "destination-in";
    rc.filter = "blur(1.2px)";
    rc.translate(D / 2, D / 2);
    rc.rotate(-ang);
    rc.translate(-mx, -my);
    rc.drawImage(mc, 0, 0);
    rc.setTransform(1, 0, 0, 1, 0, 0);
    rc.filter = "none";
    const a = rc.getImageData(0, 0, D, D).data;
    let x0 = D, y0 = D, x1 = 0, y1 = 0;
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) if (a[(y * D + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const k = Math.min(1, 1000 / w);
    const out = document.createElement("canvas");
    out.width = Math.round(w * k);
    out.height = Math.round(h * k);
    out.getContext("2d")!.drawImage(rot, x0, y0, w, h, 0, 0, out.width, out.height);
    setResult(out);
    setFlip(false);
    setStep("confirm");
  };

  useEffect(() => {
    const c = preview.current;
    if (!c || !result) return;
    c.width = result.width;
    c.height = result.height;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    if (flip) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(result, 0, 0);
    ctx.restore();
  }, [result, flip, step]);

  const done = () => {
    preview.current?.toBlob((b) => b && onDone(b), "image/png");
  };

  return (
    <section className="cutout">
      {step === "select" ? (
        <>
          <div className="chips" role="group" aria-label="切り抜きの道具">
            {(
              [
                ["auto", "タップで自動"],
                ["autoMinus", "自動で除く"],
                ["lasso", "なぞって囲む"],
                ["add", "足す"],
                ["erase", "消す"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={`chip${tool === k ? " on" : ""}`} aria-pressed={tool === k} onClick={() => setTool(k)}>
                {l}
              </button>
            ))}
          </div>
          <p className="small" aria-live="polite">{msg}</p>
          <canvas ref={view} className="cutout-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ touchAction: "none", cursor: busy ? "progress" : "crosshair" }} />
          <div className="gyotaku-actions">
            <button className="submit" onClick={finish} disabled={!has || busy}>次へ</button>
            <button className="linklike" onClick={() => { mask.current?.fill(0); points.current = []; setHas(false); paint(); }}>選び直す</button>
            <button className="linklike" onClick={onCancel}>やめる</button>
          </div>
        </>
      ) : (
        <>
          <p className="small">魚の頭が<b>右</b>を向くようにしてください。</p>
          <div className="cutout-preview">
            <canvas ref={preview} />
          </div>
          <div className="gyotaku-actions">
            <button className="submit" onClick={done}>これで決定</button>
            <button className="linklike" onClick={() => setFlip((f) => !f)}>左右を反転</button>
            <button className="linklike" onClick={() => setStep("select")}>切り抜きに戻る</button>
          </div>
        </>
      )}
      <p className="small">写真はこの端末の中だけで処理・保存し、どこにも送信しません。自動で選ぶ時は、画像認識のプログラム（Google MediaPipe）を一度だけダウンロードします。</p>
    </section>
  );
}
