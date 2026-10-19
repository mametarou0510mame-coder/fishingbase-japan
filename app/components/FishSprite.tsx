// 魚種ごとの簡単な絵（右向き）。マイ水族館と図鑑で使う。
type Shape = "fish" | "tall" | "long" | "flat" | "squid" | "octopus" | "eel" | "round";
type Art = { shape: Shape; body: string; back: string; belly?: string; stripe?: "h" | "v" | "dots"; stripeColor?: string; fin?: string };

const ART: Record<string, Art> = {
  アジ: { shape: "fish", body: "#b9c8d6", back: "#4f7ea6", belly: "#eef3f7", stripe: "h", stripeColor: "#d9b84a" },
  サバ: { shape: "fish", body: "#a9c3cf", back: "#2e6b6a", belly: "#f1f4f6", stripe: "v", stripeColor: "#1f4a4a" },
  イワシ: { shape: "fish", body: "#c7d3de", back: "#3a5f8c", belly: "#f4f7fa", stripe: "dots", stripeColor: "#24456e" },
  タチウオ: { shape: "long", body: "#dfe7ee", back: "#b9c6d2" },
  "チヌ（クロダイ）": { shape: "tall", body: "#6f7a86", back: "#47515c", belly: "#a7b0b9" },
  "ハマチ・ブリ": { shape: "fish", body: "#c9d6df", back: "#3b6a92", belly: "#f3f6f8", stripe: "h", stripeColor: "#e2c13a" },
  "サゴシ（サワラ）": { shape: "long", body: "#c4d2dd", back: "#55789a", stripe: "dots", stripeColor: "#33557a" },
  "シオ（カンパチ）": { shape: "fish", body: "#d3cdbf", back: "#7a6a52", belly: "#f4f1ea", stripe: "h", stripeColor: "#d6b45c" },
  メバル: { shape: "tall", body: "#8a6a58", back: "#5e463a", belly: "#c7a995" },
  "ガシラ（カサゴ）": { shape: "tall", body: "#c0603f", back: "#8e3e27", belly: "#e8b49a", stripe: "dots", stripeColor: "#f2d3c2" },
  "アコウ（キジハタ）": { shape: "tall", body: "#c9875a", back: "#9b5d38", belly: "#efcba9", stripe: "dots", stripeColor: "#f0b04a" },
  "グレ（メジナ）": { shape: "tall", body: "#4a5d57", back: "#2f3d39", belly: "#7e918b" },
  マダイ: { shape: "tall", body: "#e58a8a", back: "#d0545c", belly: "#f6d7d2", stripe: "dots", stripeColor: "#7ec3e6" },
  ヘダイ: { shape: "tall", body: "#b9c0c6", back: "#8c959d", belly: "#e8ecef" },
  コブダイ: { shape: "tall", body: "#c46e5a", back: "#9a4a3e", belly: "#e9b9a8" },
  ウミタナゴ: { shape: "tall", body: "#b8a99a", back: "#7d6c5d", belly: "#e7ddd2" },
  ベラ: { shape: "fish", body: "#7bb36a", back: "#4b8a45", belly: "#d9e9b8", stripe: "h", stripeColor: "#e86a4a" },
  カワハギ: { shape: "flat", body: "#c9b27e", back: "#9d8657", belly: "#ece0c0", stripe: "dots", stripeColor: "#7e6a42" },
  ウマヅラハギ: { shape: "flat", body: "#8e9ca8", back: "#5f6e7b", belly: "#c9d2da" },
  サヨリ: { shape: "eel", body: "#cfe0dc", back: "#5f9c8f" },
  スズキ: { shape: "fish", body: "#c3ccd4", back: "#61707e", belly: "#eef1f4" },
  アオリイカ: { shape: "squid", body: "#ecd8cf", back: "#c99c8a" },
  タコ: { shape: "octopus", body: "#c96a5f", back: "#9e4a41" },
  キス: { shape: "fish", body: "#ead9b8", back: "#c9b48d", belly: "#faf3e3" },
  カレイ: { shape: "round", body: "#a28a64", back: "#7e6847", stripe: "dots", stripeColor: "#5f4d33" },
  ヒラメ: { shape: "round", body: "#8f7b5c", back: "#6a593f", stripe: "dots", stripeColor: "#4f4230" },
  アイナメ: { shape: "fish", body: "#a6845a", back: "#735a3b", belly: "#dcc6a5", stripe: "dots", stripeColor: "#5a452c" },
  ハゼ: { shape: "fish", body: "#d3c3a1", back: "#a0906e", stripe: "dots", stripeColor: "#6f6248" },
  ボラ: { shape: "fish", body: "#aab6bf", back: "#5d6b77", belly: "#e6eaee", stripe: "h", stripeColor: "#7d8a95" },
  コノシロ: { shape: "fish", body: "#c9d3dc", back: "#4d6e8e", belly: "#f2f5f8", stripe: "dots", stripeColor: "#2d4a68" },
  イシダイ: { shape: "tall", body: "#d8d8c8", back: "#9a9a88", stripe: "v", stripeColor: "#2b2b2b" },
  ハオコゼ: { shape: "tall", body: "#b5653f", back: "#7f3f24", stripe: "dots", stripeColor: "#f1c3a8" },
  イサキ: { shape: "fish", body: "#a4ae8e", back: "#6c7656", belly: "#dfe4d0", stripe: "h", stripeColor: "#cbd2b4" },
  サッパ: { shape: "tall", body: "#d0dbe3", back: "#5c7f9a", belly: "#f4f7f9" },
  コロダイ: { shape: "tall", body: "#9fa6a0", back: "#6a716b", stripe: "dots", stripeColor: "#e6b34a" },
  ハモ: { shape: "eel", body: "#a99c84", back: "#7d705a" },
  エソ: { shape: "long", body: "#c9b39a", back: "#9e8569", stripe: "dots", stripeColor: "#7c6650" },
  フグ: { shape: "round", body: "#d8cfa8", back: "#6d6b52", stripe: "dots", stripeColor: "#3f3d2c" },
  その他: { shape: "fish", body: "#a8b8c8", back: "#6a8098", belly: "#e6edf3" },
};

export const artOf = (sp: string) => ART[sp] ?? ART["その他"];

export default function FishSprite({ species, width = 120, gray = false }: { species: string; width?: number; gray?: boolean }) {
  const a = artOf(species);
  const c = (x?: string) => (gray ? "#c9d1d9" : x);
  const eye = (cx: number, cy: number, r = 3.2) => (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#fff" />
      <circle cx={cx + 0.6} cy={cy} r={r * 0.55} fill="#1d2733" />
    </>
  );
  const vb = "0 0 100 60";
  let g: React.ReactNode;
  switch (a.shape) {
    case "squid":
      g = (
        <g>
          <path d="M8 30 Q30 14 62 22 L70 30 L62 38 Q30 46 8 30 Z" fill={c(a.body)} />
          <path d="M6 30 Q14 16 24 22 M6 30 Q14 44 24 38" stroke={c(a.back)} strokeWidth="3" fill="none" />
          {[...Array(5)].map((_, i) => (
            <path key={i} d={`M68 ${26 + i * 2} q12 ${-4 + i * 2} 26 ${-6 + i * 3}`} stroke={c(a.back)} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          ))}
          {eye(64, 27, 3)}
        </g>
      );
      break;
    case "octopus":
      g = (
        <g>
          <ellipse cx="50" cy="20" rx="20" ry="16" fill={c(a.body)} />
          {[...Array(6)].map((_, i) => (
            <path key={i} d={`M${36 + i * 5.5} 32 q${-6 + i * 2} 14 ${-2 + i * 2} 24`} stroke={c(a.body)} strokeWidth="5" fill="none" strokeLinecap="round" />
          ))}
          {eye(44, 24, 3)}
          {eye(56, 24, 3)}
        </g>
      );
      break;
    case "long":
    case "eel": {
      const h = a.shape === "eel" ? 6 : 9;
      g = (
        <g>
          <path d={`M2 30 Q50 ${30 - h} 92 30 Q50 ${30 + h} 2 30 Z`} fill={c(a.body)} />
          <path d={`M10 30 Q50 ${30 - h} 90 29`} stroke={c(a.back)} strokeWidth="3" fill="none" />
          {a.stripe === "dots" && [...Array(8)].map((_, i) => <circle key={i} cx={20 + i * 8} cy={28} r="1.4" fill={c(a.stripeColor)} />)}
          {eye(86, 28.5, 2.4)}
        </g>
      );
      break;
    }
    default: {
      const ry = a.shape === "tall" ? 18 : a.shape === "flat" ? 20 : a.shape === "round" ? 16 : 12;
      const tail = a.shape === "round" ? 0 : 1;
      g = (
        <g>
          {tail ? <path d={`M22 30 L4 ${30 - ry * 0.8} L8 30 L4 ${30 + ry * 0.8} Z`} fill={c(a.back)} /> : null}
          <ellipse cx="54" cy="30" rx={a.shape === "round" ? 34 : 34} ry={ry} fill={c(a.body)} />
          <path d={`M22 30 Q54 ${30 - ry * 1.15} 86 28 Q60 ${30 - ry * 0.3} 22 30 Z`} fill={c(a.back)} />
          {a.belly && <path d={`M28 33 Q54 ${30 + ry * 1.05} 82 33 Q54 ${30 + ry * 0.4} 28 33 Z`} fill={c(a.belly)} />}
          {a.stripe === "h" && <path d="M26 29 L84 29" stroke={c(a.stripeColor)} strokeWidth="2" />}
          {a.stripe === "v" && [...Array(5)].map((_, i) => <path key={i} d={`M${34 + i * 9} ${30 - ry + 3} L${32 + i * 9} ${30 + ry - 3}`} stroke={c(a.stripeColor)} strokeWidth="2.6" />)}
          {a.stripe === "dots" && [...Array(9)].map((_, i) => <circle key={i} cx={34 + (i % 5) * 9} cy={24 + Math.floor(i / 5) * 9} r="1.8" fill={c(a.stripeColor)} />)}
          {a.shape === "tall" && <path d={`M40 ${30 - ry} L52 ${30 - ry - 7} L66 ${30 - ry + 1}`} fill={c(a.back)} />}
          {a.shape === "flat" && <path d="M70 14 L74 4" stroke={c(a.back)} strokeWidth="2.5" />}
          {eye(76, 26)}
        </g>
      );
    }
  }
  return (
    <svg viewBox={vb} width={width} height={(width * 60) / 100} aria-label={species} role="img">
      {g}
    </svg>
  );
}
