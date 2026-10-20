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

const W = 1200, H = 800;

export default function Gyotaku({ data, onClose }: { data: GyotakuData; onClose?: () => void }) {
  const [mode, setMode] = useState<"ink" | "color" | "photo">(data.photo ? "photo" : "ink");
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
  const name = data.species.replace(/（.*?）/g, "");
  const fishW = 820, fishX = 40, fishY = 130;
  // 魚の絵は横幅の 6%（口先）〜 94%（尾の先）が全長（頭が左）
  // 写真は 820×470 の枠に収める（写真の横幅＝全長）
  const ph = photo ? (() => { const k = Math.min(820 / photo.w, 470 / photo.h); const w = photo.w * k, h = photo.h * k; return { x: 40 + (820 - w) / 2, y: 385 - h / 2, w, h }; })() : null;
  const x0 = ph ? ph.x : fishX + fishW * 0.06, x1 = ph ? ph.x + ph.w : fishX + fishW * 0.94;
  const size = data.sizeCm && data.sizeCm > 0 ? data.sizeCm : null;
  const pxPerCm = size ? (x1 - x0) / size : 0;
  const step = size ? (size > 80 ? 10 : size > 30 ? 5 : 1) : 0;
  const rulerY = 650;

  const fileName = `gyotaku-${data.date}-${name}.png`;
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
      c.width = W * 2;
      c.height = H * 2;
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
        await nav.share({ files: [file], text: `${name}${size ? ` ${size}cm` : ""}を釣りました！ #ツレドキ関西 #デジタル魚拓` });
      } else {
        await save();
      }
    } catch {
      /* 共有を取り消した時など */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gyotaku">
      <div className="chips" role="group" aria-label="魚拓の種類">
        {data.photo && <button className={`chip${mode === "photo" ? " on" : ""}`} aria-pressed={mode === "photo"} onClick={() => setMode("photo")}>写真の魚拓</button>}
        <button className={`chip${mode === "ink" ? " on" : ""}`} aria-pressed={mode === "ink"} onClick={() => setMode("ink")}>墨の魚拓</button>
        {!data.photo && <button className={`chip${mode === "color" ? " on" : ""}`} aria-pressed={mode === "color"} onClick={() => setMode("color")}>カラー魚拓</button>}
      </div>
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="gyotaku-svg" role="img" aria-label={`${name}の魚拓`}>
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
        </defs>
        <rect width={W} height={H} fill="#f1e9d6" filter="url(#gy-paper)" />
        <rect x="18" y="18" width={W - 36} height={H - 36} fill="none" stroke="#c9b48a" strokeWidth="2" opacity="0.6" />

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
        <VText x={1115} y={95} text={name.slice(0, 6)} size={name.length > 4 ? 52 : 62} weight={700} />
        {size && <VText x={1040} y={110} text={`全長${kanjiSize(size)}センチ`} size={28} />}
        <VText x={size ? 990 : 1040} y={110} text={kanjiDate(data.date)} size={24} />
        {data.spot && data.spot !== "未記入" && <VText x={size ? 945 : 995} y={110} text={data.spot.slice(0, 14)} size={24} />}
        {/* 右下：釣り人と落款 */}
        <VText x={1115} y={name.length > 4 ? 560 : 500} text={`${data.angler.slice(0, name.length > 4 ? 4 : 6)}釣`} size={28} />
        <g filter="url(#gy-seal)" transform={`rotate(-3 1050 ${H - 80})`}>
          <rect x="1022" y={H - 110} width="56" height="56" fill="none" stroke="#b5291f" strokeWidth="5" rx="4" />
          <text x="1050" y={H - 86} fontSize="20" fill="#b5291f" textAnchor="middle" fontFamily="serif" fontWeight="700">ツレ</text>
          <text x="1050" y={H - 63} fontSize="20" fill="#b5291f" textAnchor="middle" fontFamily="serif" fontWeight="700">ドキ</text>
        </g>
        <text x={W - 30} y={H - 28} fontSize="14" fill="#8a7a5a" textAnchor="end" fontFamily="sans-serif">ツレドキ関西 マイ水族館</text>
      </svg>
      <div className="gyotaku-actions">
        <button className="submit" onClick={share} disabled={busy}>画像で保存・共有</button>
        {onClose && <button className="linklike" onClick={onClose}>閉じる</button>}
      </div>
      <p className="small">{data.photo ? "写真の魚の横幅を全長として目盛りを付けています。" : "魚の絵は魚種ごとのイラストです。写真を取り込むと、写真から魚拓を作れます。"}画像はこの端末の中だけで作られ、どこにも送信されません。</p>
    </section>
  );
}
