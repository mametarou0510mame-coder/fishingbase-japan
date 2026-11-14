"use client";

// デジタル魚拓。釣った魚を和紙に墨で写したような1枚の絵にして、画像で保存・共有できる。
// 魚は寸法に合わせた目盛り（cm）の上にのせ、魚種・全長・日付・釣り場・釣り人を縦書きで入れる。
import { useEffect, useRef, useState } from "react";
import { inkify } from "@/lib/inkify";
import FishSprite from "@/app/components/FishSprite";

export type GyotakuData = { species: string; sizeCm: number | null; date: string; spot: string; angler: string; method?: string; photo?: string /* 切り抜いた写真（data URL） */ };

const KANJI = "〇一二三四五六七八九";
// 数字を漢数字に（例：2026 → 二〇二六、32 → 三十二）
function kanjiNum(n: number, positional = false): string {
  if (positional) return String(n).split("").map((d) => KANJI[Number(d)] ?? d).join("");
  if (n === 0) return "〇";
  const units = ["", "十", "百", "千"];
  const ds = String(Math.floor(n)).split("").reverse();
  let out = "";
  ds.forEach((d, i) => {
    const v = Number(d);
    if (!v) return;
    out = (v === 1 && i > 0 ? "" : KANJI[v]) + units[i] + out;
  });
  return out;
}
const kanjiSize = (cm: number) => {
  const [i, f] = String(Math.round(cm * 10) / 10).split(".");
  return kanjiNum(Number(i)) + (f ? "・" + KANJI[Number(f)] : "");
};
const kanjiDate = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return `${kanjiNum(y, true)}年${kanjiNum(m)}月${kanjiNum(dd)}日`;
};

// 縦書き（1文字ずつ下へ並べる）
function VText({ x, y, text, size, color = "#1a1a1a", weight = 400, gap = 1.12 }: { x: number; y: number; text: string; size: number; color?: string; weight?: number; gap?: number }) {
  return (
    <g fontFamily="'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif" fontSize={size} fill={color} fontWeight={weight} textAnchor="middle">
      {[...text].map((ch, i) =>
        ch === " " ? null : (
          <text key={i} x={x} y={y + i * size * gap} transform={/[ー〜]/.test(ch) ? `rotate(90 ${x} ${y + i * size * gap - size * 0.35})` : undefined}>
            {ch}
          </text>
        ),
      )}
    </g>
  );
}

// 共有先に合わせた3つの形（2026-11-14 オーナー：X や Instagram で共有したくなる魚拓に）
//   x：X（旧Twitter）のタイムラインで切れない 16:9
//   ig：Instagram の投稿で大きく見える 4:5
//   story：Instagram のストーリー 9:16（上下の 250px ほどは、名前やボタンが重なるので空けておく）
type Fmt = "x" | "ig" | "story";
type Box = { x: number; y: number; w: number; h: number };
type Layout = { W: number; H: number; fish: Box; rulerY: number; colX: number[]; colY: number; nameY: number; badge: { x: number; y: number; s: number } | null; anglerY: number; sealY: number; footY: number };
const LAYOUTS: Record<Fmt, Layout> = {
  x: { W: 1200, H: 675, fish: { x: 40, y: 95, w: 800, h: 390 }, rulerY: 535, colX: [1115, 1045, 995, 950], colY: 95, nameY: 80, badge: null, anglerY: 0, sealY: 552, footY: 615 },
  ig: { W: 1080, H: 1350, fish: { x: 40, y: 540, w: 1000, h: 500 }, rulerY: 1110, colX: [990, 915, 865, 820], colY: 110, nameY: 90, badge: { x: 70, y: 150, s: 170 }, anglerY: 1170, sealY: 1170, footY: 1280 },
  story: { W: 1080, H: 1920, fish: { x: 40, y: 800, w: 1000, h: 520 }, rulerY: 1385, colX: [990, 915, 865, 820], colY: 300, nameY: 280, badge: { x: 70, y: 340, s: 190 }, anglerY: 1440, sealY: 1440, footY: 1580 },
};
const FMT_LABEL: Record<Fmt, string> = { ig: "Instagram 投稿（縦）", story: "ストーリー", x: "X（横）" };

export default function Gyotaku({ data, onClose }: { data: GyotakuData; onClose?: () => void }) {
  const [mode, setMode] = useState<"ink" | "color" | "photo">(data.photo ? "photo" : "ink");
  const [fmt, setFmt] = useState<Fmt>("ig");
  const [photo, setPhoto] = useState<{ url: string; ink: string; w: number; h: number } | null>(null);
  // 写真があれば、墨の魚拓用の絵もこの端末の中で作る
  useEffect(() => {
    if (!data.photo) return setPhoto(null);
    setMode("photo");
    const img = new Image();
    img.onload = () => {
      const ink = inkify(img).toDataURL("image/png");
      setPhoto({ url: data.photo!, ink, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = data.photo;
  }, [data.photo]);
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const L = LAYOUTS[fmt];
  const { W, H } = L;
  const name = data.species.replace(/（.*?）/g, "");
  const long = name.length > 4;
  // 写真は魚の枠に収める（写真の横幅＝全長）。絵は横幅の 6%（口先）〜 94%（尾の先）が全長（頭が左）
  const ph = photo ? (() => { const k = Math.min(L.fish.w / photo.w, L.fish.h / photo.h); const w = photo.w * k, h = photo.h * k; return { x: L.fish.x + (L.fish.w - w) / 2, y: L.fish.y + (L.fish.h - h) / 2, w, h }; })() : null;
  const fishW = L.fish.w, fishX = L.fish.x, fishY = L.fish.y + (L.fish.h - fishW * 0.6) / 2;
  const x0 = ph ? ph.x : fishX + fishW * 0.06, x1 = ph ? ph.x + ph.w : fishX + fishW * 0.94;
  const size = data.sizeCm && data.sizeCm > 0 ? data.sizeCm : null;
  const pxPerCm = size ? (x1 - x0) / size : 0;
  const step = size ? (size > 80 ? 10 : size > 30 ? 5 : 1) : 0;
  const rulerY = L.rulerY;
  const [c0, c1, c2, c3] = L.colX;
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const shareText = `${name}${size ? ` ${size}cm` : ""}を釣りました！\nデジタル魚拓はツレドキで無料で作れます`;
  const tags = "#ツレドキ #ツレドキ関西 #デジタル魚拓 #釣り";

  const fileName = `gyotaku-${data.date}-${name}-${fmt}.png`;
  const toPng = async (): Promise<Blob | null> => {
    const svg = svgRef.current;
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = new Image();
      await new Promise<void>((ok, ng) => {
        img.onload = () => ok();
        img.onerror = () => ng(new Error("画像にできませんでした"));
        img.src = url;
      });
      const c = document.createElement("canvas");
      // X は 2倍、Instagram は 1080 幅がちょうど（大きすぎると共有で縮められて文字がにじむ）
      const k = fmt === "x" ? 2 : 1;
      c.width = W * k;
      c.height = H * k;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((ok) => c.toBlob(ok, "image/png"));
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const b = await toPng();
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    setBusy(true);
    try {
      const b = await toPng();
      if (!b) return;
      const file = new File([b], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: `${shareText}\n${site}/aquarium/\n${tags}` });
      } else {
        await save();
      }
    } catch {
      /* 共有を取り消した時など */
    } finally {
      setBusy(false);
    }
  };
  // X：画像は投稿画面に自動では付かないので、先に保存してから投稿画面を開く
  const postX = async () => {
    await save();
    const u = `https://x.com/intent/post?text=${encodeURIComponent(`${shareText}\n${tags}`)}&url=${encodeURIComponent(`${site}/aquarium/`)}`;
    window.open(u, "_blank", "noopener");
  };

  return (
    <section className="gyotaku">
      <div className="chips" role="group" aria-label="魚拓の種類">
        {data.photo && <button className={`chip${mode === "photo" ? " on" : ""}`} aria-pressed={mode === "photo"} onClick={() => setMode("photo")}>写真の魚拓</button>}
        <button className={`chip${mode === "ink" ? " on" : ""}`} aria-pressed={mode === "ink"} onClick={() => setMode("ink")}>墨の魚拓</button>
        {!data.photo && <button className={`chip${mode === "color" ? " on" : ""}`} aria-pressed={mode === "color"} onClick={() => setMode("color")}>カラー魚拓</button>}
      </div>
      <div className="chips" role="group" aria-label="画像の形">
        {(Object.keys(FMT_LABEL) as Fmt[]).map((f) => (
          <button key={f} className={`chip${fmt === f ? " on" : ""}`} aria-pressed={fmt === f} onClick={() => setFmt(f)}>{FMT_LABEL[f]}</button>
        ))}
      </div>
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className={`gyotaku-svg gyotaku-${fmt}`} role="img" aria-label={`${name}の魚拓`}>
        <defs>
          <filter id="gy-paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.9" numOctaves="3" seed="5" result="fiber" />
            <feColorMatrix in="fiber" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.25  0 0 0 0.22 0" result="f" />
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="9" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.12 0" result="g" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="f" />
              <feMergeNode in="g" />
            </feMerge>
          </filter>
          <filter id="gy-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 0.8 0" />
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="gy-seal" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="2" seed="4" result="n2" />
            <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.35" result="m" />
            <feComposite in="d" in2="m" operator="in" />
          </filter>
          <filter id="gy-brush" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id="gy-vig" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#5a4320" stopOpacity="0.28" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="#f1e9d6" filter="url(#gy-paper)" />
        <rect width={W} height={H} fill="url(#gy-vig)" />
        <rect x="18" y="18" width={W - 36} height={H - 36} fill="none" stroke="#c9b48a" strokeWidth="2" opacity="0.6" />

        {/* 縦長の形：左上に全長を大きく（ひと目でサイズが分かると、共有されやすい） */}
        {L.badge && size && (
          <g filter="url(#gy-brush)">
            <text x={L.badge.x} y={L.badge.y + L.badge.s} fontSize={L.badge.s} fontWeight={900} fill="#9b2f22" fontFamily="'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif">{Math.round(size * 10) / 10}</text>
            <text x={L.badge.x + 8} y={L.badge.y + L.badge.s + 70} fontSize={56} fontWeight={700} fill="#9b2f22" fontFamily="'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif">センチ</text>
          </g>
        )}

        {/* 魚拓は昔ながらの「頭が左」に。絵・写真とも左右を反転して置く */}
        {ph && photo ? (
          <g transform={`translate(${ph.x * 2 + ph.w} 0) scale(-1 1)`}>
            {mode === "photo" ? (
              <>
                <image href={photo.url} x={ph.x - 6} y={ph.y + 10} width={ph.w} height={ph.h} filter="url(#gy-shadow)" opacity="0.5" />
                <image href={photo.url} x={ph.x} y={ph.y} width={ph.w} height={ph.h} />
              </>
            ) : (
              <image href={photo.ink} x={ph.x} y={ph.y} width={ph.w} height={ph.h} style={{ mixBlendMode: "multiply" }} />
            )}
          </g>
        ) : (
          <g transform={`translate(${fishX + fishW} ${fishY}) scale(-1 1)`}>
            <FishSprite species={data.species} width={fishW} ink={mode === "ink"} />
          </g>
        )}

        {size && (
          <g stroke="#3a3326" fill="#3a3326" fontFamily="serif">
            <line x1={x0} y1={rulerY} x2={x1} y2={rulerY} strokeWidth="1.5" />
            {[...Array(Math.floor(size) + 1)].map((_, i) => {
              const x = x0 + i * pxPerCm;
              const big = i % step === 0;
              if (!big && pxPerCm < 4) return null;
              return <line key={i} x1={x} y1={rulerY} x2={x} y2={rulerY + (big ? 14 : 6)} strokeWidth={big ? 1.4 : 0.8} />;
            })}
            {[...Array(Math.floor(size / step) + 1)].map((_, i) => (
              <text key={i} x={x0 + i * step * pxPerCm} y={rulerY + 34} fontSize="18" textAnchor="middle" stroke="none">
                {i * step}
              </text>
            ))}
            <line x1={x1} y1={rulerY - 10} x2={x1} y2={rulerY + 14} strokeWidth="2" stroke="#9b2f22" />
            <text x={x1} y={rulerY - 16} fontSize="18" textAnchor="middle" stroke="none" fill="#9b2f22">{size}cm</text>
          </g>
        )}

        {/* 右の縦書き */}
        <VText x={c0} y={L.nameY} text={name.slice(0, 6)} size={long ? 52 : 62} weight={700} />
        {size && <VText x={c1} y={L.colY} text={`全長${kanjiSize(size)}センチ`} size={28} />}
        <VText x={size ? c2 : c1} y={L.colY} text={kanjiDate(data.date)} size={24} />
        {data.spot && data.spot !== "未記入" && <VText x={size ? c3 : c2} y={L.colY} text={data.spot.slice(0, 14)} size={24} />}
        {/* 右下：釣り人と落款（X は右の列の下、縦長は魚の下） */}
        {fmt === "x" ? (
          <VText x={c0} y={long ? 445 : 390} text={`${data.angler.slice(0, long ? 3 : 4)}釣`} size={28} />
        ) : (
          <text x={W - 150} y={L.anglerY + 40} fontSize={34} textAnchor="end" fill="#1a1a1a" fontFamily="'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif">{data.angler.slice(0, 10)} 釣</text>
        )}
        <g filter="url(#gy-seal)" transform={`rotate(-3 ${W - 90} ${L.sealY + 28})`}>
          <rect x={W - 118} y={L.sealY} width="56" height="56" fill="none" stroke="#b5291f" strokeWidth="5" rx="4" />
          <text x={W - 90} y={L.sealY + 24} fontSize="20" fill="#b5291f" textAnchor="middle" fontFamily="serif" fontWeight="700">ツレ</text>
          <text x={W - 90} y={L.sealY + 47} fontSize="20" fill="#b5291f" textAnchor="middle" fontFamily="serif" fontWeight="700">ドキ</text>
        </g>
        {/* 下の帯：どこで作れるか（見た人がツレドキを探せるように） */}
        <g fontFamily="'Noto Sans JP','Hiragino Sans',sans-serif">
          <rect x="18" y={L.footY} width={W - 36} height={fmt === "x" ? 42 : 56} fill="#0e2236" opacity="0.92" />
          <text x="40" y={L.footY + (fmt === "x" ? 29 : 38)} fontSize={fmt === "x" ? 20 : 26} fontWeight={900} fill="#ffd24a">ツレドキ関西</text>
          <text x={W - 40} y={L.footY + (fmt === "x" ? 29 : 38)} fontSize={fmt === "x" ? 18 : 23} fontWeight={700} fill="#fff" textAnchor="end">デジタル魚拓は無料｜「ツレドキ 関西」で検索</text>
        </g>
      </svg>
      <div className="gyotaku-actions">
        <button className="submit" onClick={share} disabled={busy}>画像で保存・共有</button>
        <button className="linklike" onClick={postX} disabled={busy}>Xにポスト</button>
        {onClose && <button className="linklike" onClick={onClose}>閉じる</button>}
      </div>
      <p className="small">{data.photo ? "写真の魚の横幅を全長として目盛りを付けています。" : "魚の絵は魚種ごとのイラストです。写真を取り込むと、写真から魚拓を作れます。"}Instagram は「Instagram 投稿」か「ストーリー」、X は「X（横）」の形がきれいに見えます。「Xにポスト」は画像を保存してから投稿画面を開くので、保存した画像を付けてください。画像はこの端末の中だけで作られ、どこにも送信されません。</p>
    </section>
  );
}
