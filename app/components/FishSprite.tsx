// 魚種ごとの絵（右向き）。マイ水族館と図鑑で使う。
// 実物に近づけるため、魚種ごとに体形・ひれ・尾・模様を変え、背から腹へのグラデーションで立体感を出す。
import { useId } from "react";

type Body = "jack" | "mackerel" | "bream" | "rock" | "bass" | "slim" | "file" | "flat" | "puffer" | "ribbon" | "eel" | "needle" | "squid" | "octopus";
type Tail = "fork" | "deep" | "trunc" | "round";
type Pattern = "scute" | "band" | "wavy" | "dots" | "spots" | "bars" | "mottle" | "blueSpots" | "stripes" | "none";
type Art = {
  body: Body;
  back: string;
  side: string;
  belly: string;
  fin: string;
  tail?: Tail;
  h?: number; // 体の高さ（半分）
  pattern?: Pattern;
  pc?: string; // 模様の色
  accent?: string; // ひれの縁・目のまわりなど
};

const ART: Record<string, Art> = {
  アジ: { body: "jack", back: "#5b7f99", side: "#c9d5de", belly: "#f3f6f8", fin: "#d9cf9a", h: 10, pattern: "scute", pc: "#8a9aa6", accent: "#e1c95a" },
  サバ: { body: "mackerel", back: "#2f6f74", side: "#b7cdd3", belly: "#f4f6f7", fin: "#7f9aa0", h: 9, pattern: "wavy", pc: "#123c40" },
  イワシ: { body: "slim", back: "#2f5b88", side: "#c4d2df", belly: "#f6f8fb", fin: "#a9b8c6", h: 8, pattern: "dots", pc: "#1f3a5c" },
  タチウオ: { body: "ribbon", back: "#c9d3dc", side: "#eef2f6", belly: "#ffffff", fin: "#dfe6ec" },
  "チヌ（クロダイ）": { body: "bream", back: "#3e4650", side: "#6e7884", belly: "#a6aeb6", fin: "#3b424a", h: 17, pattern: "bars", pc: "rgba(40,46,54,.35)" },
  "ハマチ・ブリ": { body: "jack", back: "#2f5f86", side: "#c7d4de", belly: "#f4f7f9", fin: "#d8c35a", h: 10.5, pattern: "band", pc: "#e3c33c" },
  "サゴシ（サワラ）": { body: "mackerel", back: "#4c6f8f", side: "#c6d3dd", belly: "#f5f7f9", fin: "#9fb0bf", h: 7, pattern: "spots", pc: "#2f4b66" },
  "シオ（カンパチ）": { body: "jack", back: "#7b6a50", side: "#d4ccbc", belly: "#f6f2ea", fin: "#cfb06a", h: 12, pattern: "band", pc: "#d9b65a", accent: "#5a4a35" },
  メバル: { body: "rock", back: "#5a4538", side: "#8e705e", belly: "#c9ad98", fin: "#5a4538", h: 14, pattern: "bars", pc: "rgba(60,40,30,.35)" },
  "ガシラ（カサゴ）": { body: "rock", back: "#8b3a24", side: "#c4673f", belly: "#ecb99c", fin: "#a84a2c", h: 14, pattern: "mottle", pc: "#f3d4c0" },
  "アコウ（キジハタ）": { body: "rock", back: "#9b5d38", side: "#c98a5c", belly: "#f0cfae", fin: "#b0683f", h: 14, pattern: "spots", pc: "#f2a03a" },
  "グレ（メジナ）": { body: "bream", back: "#26332f", side: "#46564f", belly: "#7c8d86", fin: "#26332f", h: 16 },
  マダイ: { body: "bream", back: "#d24f5a", side: "#ea8b8b", belly: "#f8dcd6", fin: "#e27b7b", h: 17, pattern: "blueSpots", pc: "#6ec3ec" },
  ヘダイ: { body: "bream", back: "#8a939b", side: "#bcc3c9", belly: "#edf0f2", fin: "#d3c27a", h: 17 },
  コブダイ: { body: "bream", back: "#9a4a3e", side: "#c46e5a", belly: "#ebbcab", fin: "#9a4a3e", h: 16 },
  ウミタナゴ: { body: "bream", back: "#7a6857", side: "#b8a897", belly: "#ece2d6", fin: "#8b7865", h: 15 },
  ベラ: { body: "slim", back: "#4f8f47", side: "#86bd73", belly: "#dcecbc", fin: "#5f9f52", h: 8.5, pattern: "stripes", pc: "#e46a48" },
  カワハギ: { body: "file", back: "#9b8456", side: "#c9b27e", belly: "#eee3c4", fin: "#b39a63", h: 17, pattern: "mottle", pc: "#7d6941" },
  ウマヅラハギ: { body: "file", back: "#5d6c79", side: "#8e9ca8", belly: "#ccd5dc", fin: "#4f88b6", h: 14 },
  サヨリ: { body: "needle", back: "#4f8f84", side: "#cfe2de", belly: "#f6faf9", fin: "#9fbcb6", accent: "#e0533f" },
  スズキ: { body: "bass", back: "#566472", side: "#c2cbd3", belly: "#f0f3f5", fin: "#8c98a3", h: 10.5 },
  アオリイカ: { body: "squid", back: "#b98a76", side: "#ead6cb", belly: "#f6ebe5", fin: "#e3c7ba", pattern: "dots", pc: "#9a6550" },
  タコ: { body: "octopus", back: "#93453b", side: "#c46a5d", belly: "#e9b5a8", fin: "#c46a5d" },
  キス: { body: "slim", back: "#c6ae86", side: "#ead9b8", belly: "#fbf5e8", fin: "#e3d3b1", h: 7.5 },
  カレイ: { body: "flat", back: "#6e5a3e", side: "#a08860", belly: "#c9b48a", fin: "#8a734f", pattern: "mottle", pc: "#5a4830" },
  ヒラメ: { body: "flat", back: "#5f4f37", side: "#8c785a", belly: "#b8a582", fin: "#75644a", pattern: "spots", pc: "#ece2cc" },
  アイナメ: { body: "bass", back: "#6e5536", side: "#a6845a", belly: "#dcc7a6", fin: "#8a6b44", h: 10, pattern: "mottle", pc: "#5a4329" },
  ハゼ: { body: "slim", back: "#8d7d5d", side: "#cbbb98", belly: "#efe6d3", fin: "#b3a37f", h: 7, pattern: "dots", pc: "#5f5238" },
  ボラ: { body: "bass", back: "#4f5d69", side: "#a7b3bc", belly: "#e8ecef", fin: "#7c8893", h: 9.5, pattern: "stripes", pc: "rgba(70,85,98,.45)" },
  コノシロ: { body: "slim", back: "#3f6488", side: "#c7d2dc", belly: "#f4f7f9", fin: "#a8b6c4", h: 10, pattern: "dots", pc: "#2b4865" },
  イシダイ: { body: "bream", back: "#8e8e7c", side: "#d6d6c6", belly: "#eeeee4", fin: "#6f6f60", h: 17, pattern: "bars", pc: "#262626" },
  ハオコゼ: { body: "rock", back: "#7d3d22", side: "#b5653f", belly: "#e4b394", fin: "#8f4628", h: 12, pattern: "mottle", pc: "#f1c3a8" },
  イサキ: { body: "bass", back: "#5d6648", side: "#a4ae8e", belly: "#e0e5d2", fin: "#7a8462", h: 11, pattern: "stripes", pc: "rgba(220,226,200,.8)" },
  サッパ: { body: "slim", back: "#4f7896", side: "#d0dbe3", belly: "#f6f8fa", fin: "#b4c2cd", h: 11 },
  コロダイ: { body: "bream", back: "#646b66", side: "#9fa6a0", belly: "#d8dcd8", fin: "#6a716b", h: 15, pattern: "spots", pc: "#e9b84a" },
  ハモ: { body: "eel", back: "#6e624d", side: "#a99c84", belly: "#e2dac9", fin: "#8a7d66" },
  エソ: { body: "bass", back: "#8f765b", side: "#c9b39a", belly: "#eee3d4", fin: "#a88f74", h: 7, pattern: "mottle", pc: "#7a624b" },
  フグ: { body: "puffer", back: "#5f5d45", side: "#c9c09a", belly: "#f6f3e6", fin: "#a9a17a", pattern: "dots", pc: "#3c3a29" },
  その他: { body: "bass", back: "#607a92", side: "#b3c3d1", belly: "#eef3f7", fin: "#8ea3b6", h: 10 },
};

export const artOf = (sp: string) => ART[sp] ?? ART["その他"];

const CY = 30;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// 体の輪郭（口 → 背 → 尾の付け根 → 腹 → 口）
function bodyPath(h: number, p: number, snout = 94, peduncle = 22, hump = 0.45) {
  const top = CY - h, bot = CY + h * 0.92;
  const hx = peduncle + (snout - peduncle) * (1 - hump);
  return `M${snout} ${CY + 1}
    C${snout - 3} ${CY - h * 0.75} ${hx + 14} ${top} ${hx} ${top}
    C${hx - 18} ${top} ${peduncle + 8} ${CY - p * 1.3} ${peduncle} ${CY - p}
    L${peduncle} ${CY + p}
    C${peduncle + 8} ${CY + p * 1.3} ${hx - 18} ${bot} ${hx} ${bot}
    C${hx + 16} ${bot} ${snout - 3} ${CY + h * 0.6} ${snout} ${CY + 1} Z`;
}

function tailPath(t: Tail, h: number, p: number, x = 22) {
  const s = Math.max(h * 0.95, 9);
  switch (t) {
    case "deep":
      return `M${x + 1} ${CY - p} C${x - 6} ${CY - p - 3} ${x - 12} ${CY - s} ${x - 18} ${CY - s - 2} C${x - 13} ${CY - 4} ${x - 13} ${CY + 4} ${x - 18} ${CY + s + 2} C${x - 12} ${CY + s} ${x - 6} ${CY + p + 3} ${x + 1} ${CY + p} Z`;
    case "trunc":
      return `M${x + 1} ${CY - p} L${x - 11} ${CY - s * 0.8} Q${x - 13} ${CY} ${x - 11} ${CY + s * 0.8} L${x + 1} ${CY + p} Z`;
    case "round":
      return `M${x + 1} ${CY - p} C${x - 8} ${CY - s * 0.9} ${x - 16} ${CY - s * 0.5} ${x - 16} ${CY} C${x - 16} ${CY + s * 0.5} ${x - 8} ${CY + s * 0.9} ${x + 1} ${CY + p} Z`;
    default:
      return `M${x + 1} ${CY - p} C${x - 5} ${CY - p - 2} ${x - 10} ${CY - s * 0.8} ${x - 15} ${CY - s * 0.9} C${x - 11} ${CY - 3} ${x - 11} ${CY + 3} ${x - 15} ${CY + s * 0.9} C${x - 10} ${CY + s * 0.8} ${x - 5} ${CY + p + 2} ${x + 1} ${CY + p} Z`;
  }
}

function Eye({ x, y, r = 3, iris = "#c9a24a" }: { x: number; y: number; r?: number; iris?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={iris} />
      <circle cx={x} cy={y} r={r * 0.62} fill="#11161c" />
      <circle cx={x + r * 0.25} cy={y - r * 0.3} r={r * 0.22} fill="#fff" opacity="0.9" />
    </g>
  );
}

// ink: 墨の魚拓のように白黒で、にじみ・かすれを付けて描く（デジタル魚拓用）
export default function FishSprite({ species, width = 120, gray = false, ink = false }: { species: string; width?: number; gray?: boolean; ink?: boolean }) {
  // 同じページに何匹も描くので、id は魚種と描画ごとに変える
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "") + [...species].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 99991, 7) + (gray ? "g" : "") + (ink ? "i" : "");
  const a0 = artOf(species);
  const g = (x: string) => (gray ? "#c9d1d9" : x);
  const a = gray
    ? { ...a0, back: "#aeb8c2", side: "#c9d1d9", belly: "#dfe5ea", fin: "#b8c1ca", pc: "#b0bac4", accent: "#b0bac4" }
    : ink
      ? { ...a0, back: "#0d0d0d", side: "#1c1c1c", belly: "#3a3a3a", fin: "#262626", pc: "rgba(0,0,0,.55)", accent: "#111" }
      : a0;
  const grad = `fg${uid}`, shine = `fs${uid}`, clip = `fc${uid}`, scale = `sc${uid}`, rays = `ry${uid}`, inkF = `ik${uid}`;
  const defs = (
    <defs>
      <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={a.back} />
        <stop offset="0.45" stopColor={a.side} />
        <stop offset="1" stopColor={a.belly} />
      </linearGradient>
      <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.28" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      {/* うろこ（魚拓ではうろこの縁が白く抜ける） */}
      <pattern id={scale} width="1.8" height="1.4" patternUnits="userSpaceOnUse">
        <path d="M0 1.4 Q0.9 0.3 1.8 1.4 M-0.9 0.7 Q0 -0.4 0.9 0.7 M0.9 0.7 Q1.8 -0.4 2.7 0.7" fill="none" stroke="#fff" strokeWidth={ink ? 0.32 : 0.22} opacity={ink ? 0.55 : 0.22} />
      </pattern>
      {/* ひれの筋（鰭条） */}
      <pattern id={rays} width="1.4" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
        <rect width="1.4" height="6" fill={a.fin} />
        <path d="M0.7 0 L0.7 6" stroke={ink ? "#000" : a.back} strokeWidth="0.45" opacity={ink ? 0.9 : 0.35} />
      </pattern>
      {ink && (
        <filter id={inkF} x="-5%" y="-15%" width="110%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="3.2" numOctaves="1" seed="8" result="n2" />
          <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      )}
    </defs>
  );
  const fin = { fill: `url(#${rays})`, opacity: ink ? 0.92 : 0.9 };
  let art: React.ReactNode;

  switch (a.body) {
    case "squid":
      art = (
        <g>
          <path className="fs-sfin" style={{ transformOrigin: "22px 30px" }} d="M6 30 C8 20 14 14 22 18 C20 22 20 38 22 42 C14 46 8 40 6 30 Z" fill={a.fin} opacity="0.7" />
          <path d="M12 30 C14 20 40 16 62 21 C68 23 70 27 70 30 C70 33 68 37 62 39 C40 44 14 40 12 30 Z" fill={`url(#${grad})`} />
          {a.pattern === "dots" && [...Array(14)].map((_, i) => <circle key={i} cx={20 + (i % 7) * 6.5} cy={25 + Math.floor(i / 7) * 7 + (i % 2)} r="1" fill={a.pc} opacity="0.6" />)}
          <g className="fs-arms" style={{ transformOrigin: "68px 30px" }}>
          {[...Array(8)].map((_, i) => (
            <path key={i} d={`M68 ${27 + i * 0.9} C76 ${26 + i * 1.2} 82 ${24 + i * 2} ${88 + (i % 3)} ${22 + i * 2.6}`} stroke={a.back} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9" />
          ))}
          <path d="M68 29 C80 28 88 30 96 26" stroke={a.back} strokeWidth="1" fill="none" />
          <path d="M68 31 C80 32 88 33 96 36" stroke={a.back} strokeWidth="1" fill="none" />
          <ellipse cx="96" cy="26" rx="1.8" ry="1.2" fill={a.back} />
          <ellipse cx="96" cy="36" rx="1.8" ry="1.2" fill={a.back} />
          </g>
          <Eye x={66} y={28} r={3.2} iris={ink ? "#efe7d6" : "#3f6d8a"} />
        </g>
      );
      break;
    case "octopus":
      art = (
        <g>
          <g className="fs-arms oct" style={{ transformOrigin: "50px 30px" }}>
          {[...Array(8)].map((_, i) => {
            const x0 = 36 + i * 4;
            const dx = -14 + i * 4.2;
            return (
              <g key={i}>
                <path d={`M${x0} 30 C${x0 + dx * 0.3} 40 ${x0 + dx * 0.8} 46 ${x0 + dx} 56 C${x0 + dx + 2} 58 ${x0 + dx + 4} 56 ${x0 + dx + 3} 53`} stroke={a.side} strokeWidth={4.2 - i * 0.15} fill="none" strokeLinecap="round" />
                {[0.35, 0.6, 0.85].map((t) => (
                  <circle key={t} cx={x0 + dx * t + 1} cy={30 + 24 * t} r="0.8" fill={a.belly} />
                ))}
              </g>
            );
          })}
          </g>
          <path d="M34 32 C30 18 38 4 52 4 C66 4 72 16 68 30 C62 36 40 36 34 32 Z" fill={`url(#${grad})`} />
          {[...Array(10)].map((_, i) => <circle key={i} cx={42 + (i % 5) * 5} cy={10 + Math.floor(i / 5) * 8} r="1.2" fill={a.back} opacity="0.5" />)}
          <Eye x={42} y={29} r={2.3} iris={ink ? "#efe7d6" : "#d8b04a"} />
          <Eye x={61} y={29} r={2.3} iris={ink ? "#efe7d6" : "#d8b04a"} />
        </g>
      );
      break;
    case "ribbon":
      // タチウオ：銀色の帯のような体、尾びれはなく先がとがる、長い背びれ、鋭い歯
      art = (
        <g className="fs-bend long" style={{ transformOrigin: "95px 30px" }}>
          <path d="M14 30 C30 26 50 22 74 22 C84 22 92 25 97 29 L90 31 C80 36 60 37 40 35 C26 34 14 31 2 33 Z" fill={`url(#${grad})`} stroke="#9aa6b0" strokeWidth="0.5" />
          <path d="M8 31.5 C28 26.5 50 22 74 22" stroke={a.fin} strokeWidth="2.2" fill="none" opacity="0.8" />
          <path d="M14 30 C30 26 50 22 74 22 C84 22 92 25 97 29 L90 31 C80 36 60 37 40 35 C26 34 14 31 2 33 Z" fill={`url(#${shine})`} />
          <path d="M97 29 L88 30.5 L92 31.5" stroke="#55606a" strokeWidth="0.7" fill="none" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${93 - i * 2} 29.5 l0.6 1.4`} stroke="#fff" strokeWidth="0.6" />)}
          <Eye x={88} y={26} r={2.6} iris={ink ? "#efe7d6" : "#e6e9ec"} />
        </g>
      );
      break;
    case "eel":
      // ハモ：細長い体、背びれと尻びれが尾までつながる
      art = (
        <g className="fs-bend long" style={{ transformOrigin: "95px 30px" }}>
          <path d="M2 30 C20 22 50 22 78 23 C88 23 95 26 98 29 C95 32 88 34 78 34 C50 35 20 36 2 30 Z" fill={a.fin} opacity="0.55" transform="translate(0,0) scale(1,1)" />
          <path d="M4 30 C20 25 50 25 78 25.5 C88 25.5 95 27 98 29.5 C95 31.5 88 32.5 78 32.5 C50 33 20 34 4 30 Z" fill={`url(#${grad})`} />
          <path d="M98 29.5 L90 30.6" stroke="#3a3328" strokeWidth="0.7" />
          <Eye x={90} y={27.5} r={1.8} iris={ink ? "#efe7d6" : "#c9b07a"} />
        </g>
      );
      break;
    case "needle":
      // サヨリ：細い体、下あごが長く先が赤い
      art = (
        <g>
          <g className="fs-tail" style={{ transformOrigin: "17px 30px" }}>
            <path d={tailPath("fork", 6, 1.6, 16)} {...fin} />
          </g>
          <path d="M16 28.6 C30 26 60 25.5 82 27 C86 27.4 88 28.3 89 29.2 L82 31.4 C60 33.5 30 33 16 31.4 Z" fill={`url(#${grad})`} />
          <path d="M18 29.2 C40 27.6 64 27.4 84 28.6" stroke={a.back} strokeWidth="0.9" fill="none" opacity="0.7" />
          <path d="M84 30.4 L100 31.2 L84 31.6 Z" fill="#d7dcde" />
          <path d="M96 31 L100 31.2 L96 31.5 Z" fill={a.accent} />
          <path d="M26 28.6 L32 26.6 L34 28.4 Z M26 31.4 L32 33.6 L34 31.6 Z" {...fin} />
          <Eye x={84} y={28.9} r={1.6} iris={ink ? "#efe7d6" : "#d9dfe3"} />
        </g>
      );
      break;
    case "flat": {
      // カレイ・ヒラメ：上から見た平たい体と、まわりを囲むひれ
      art = (
        <g>
          <path d="M14 30 C16 12 40 6 62 8 C80 10 92 20 92 30 C92 40 80 50 62 52 C40 54 16 48 14 30 Z" fill={a.fin} opacity="0.75" />
          {[...Array(22)].map((_, i) => {
            const t = (i / 21) * Math.PI;
            const x = 52 + Math.cos(Math.PI - t) * 37;
            return <path key={i} d={`M${x} ${30 - Math.sin(t) * 19} L${x} ${30 - Math.sin(t) * 22.5}`} stroke={a.back} strokeWidth="0.5" opacity="0.5" />;
          })}
          <g className="fs-tail" style={{ transformOrigin: "20px 30px" }}>
            <path d={`M20 30 L4 20 Q8 30 4 40 Z`} fill={a.fin} />
          </g>
          <ellipse cx="54" cy="30" rx="34" ry="18" fill={`url(#${grad})`} />
          <ellipse cx="54" cy="30" rx="34" ry="18" fill={`url(#${scale})`} opacity="0.7" />
          {a.pattern === "mottle" &&
            [...Array(9)].map((_, i) => <ellipse key={i} cx={30 + (i % 5) * 11} cy={22 + Math.floor(i / 5) * 14 + (i % 2) * 3} rx="3.4" ry="2.4" fill={a.pc} opacity="0.45" />)}
          {a.pattern === "spots" && [...Array(10)].map((_, i) => <circle key={i} cx={28 + (i % 5) * 11} cy={22 + Math.floor(i / 5) * 13 + (i % 2) * 3} r="1.5" fill={a.pc} opacity="0.7" />)}
          <path d="M24 30 C40 27 64 26 84 28" stroke={a.belly} strokeWidth="0.6" fill="none" opacity="0.6" />
          <path d="M80 18 C86 24 86 36 80 42" stroke={a.back} strokeWidth="0.8" fill="none" opacity="0.7" />
          <Eye x={82} y={24} r={2.2} iris={ink ? "#efe7d6" : "#e2c66a"} />
          <Eye x={85} y={30} r={2.2} iris={ink ? "#efe7d6" : "#e2c66a"} />
          <path d="M88 35 Q91 36 90 38" stroke="#3a2f20" strokeWidth="0.8" fill="none" />
        </g>
      );
      break;
    }
    case "puffer":
      art = (
        <g>
          <g className="fs-tail" style={{ transformOrigin: "27px 30px" }}>
            <path d={tailPath("trunc", 8, 4, 26)} {...fin} />
          </g>
          <path d="M26 30 C26 16 44 9 62 10 C80 11 92 20 92 30 C92 40 80 48 62 49 C44 50 26 44 26 30 Z" fill={`url(#${grad})`} />
          {[...Array(16)].map((_, i) => <circle key={i} cx={36 + (i % 6) * 8} cy={16 + Math.floor(i / 6) * 7 + (i % 2) * 2} r="1.6" fill={a.pc} opacity="0.75" />)}
          <ellipse cx="58" cy="34" rx="6" ry="4" fill={a.back} opacity="0.55" />
          <path d="M54 12 C58 6 64 6 66 11 Z" {...fin} />
          <path d="M54 48 C58 54 64 54 66 49 Z" {...fin} />
          <g className="fs-pec" style={{ transformOrigin: "70px 31px" }}>
            <path d="M70 30 C66 25 66 35 70 32 Z" fill={a.fin} opacity="0.8" />
          </g>
          <path d="M91 31 Q93 32 91 33" stroke="#2b2a1f" strokeWidth="1" fill="none" />
          <Eye x={80} y={23} r={3.2} iris={ink ? "#efe7d6" : "#5fb0a0"} />
        </g>
      );
      break;
    default: {
      // ふつうの魚の形
      const B = a.body;
      const h = a.h ?? 11;
      const p = B === "mackerel" || B === "jack" ? 1.6 : B === "file" ? 3.5 : 2.6;
      const tail: Tail = a.tail ?? (B === "jack" || B === "mackerel" ? "deep" : B === "rock" || B === "file" ? "trunc" : B === "slim" && species === "ハゼ" ? "round" : "fork");
      const snout = B === "rock" ? 95 : B === "file" ? 92 : 94;
      const hump = B === "bream" ? 0.5 : B === "file" ? 0.55 : B === "rock" ? 0.6 : 0.45;
      const body = bodyPath(h, p, snout, 22, hump);
      const top = CY - h;
      const headX = snout - (B === "rock" ? 22 : B === "bream" ? 20 : 17);
      const eyeR = B === "rock" ? 3.4 : B === "bream" ? 3.2 : B === "slim" ? 2.4 : 2.9;
      const eyeY = CY - h * (B === "rock" ? 0.42 : 0.3);
      // 背びれ（とげのある前半＋やわらかい後半）
      const spiny = B === "bream" || B === "rock" || B === "bass";
      // 体の上下のふち（ひれの付け根を体に沿わせるため）
      const hx = 22 + (snout - 22) * (1 - hump);
      const eT = (x: number) => {
        if (x <= hx) { const t = clamp01((x - 22) / (hx - 22)); return CY - (p + (h - p) * Math.sin((t * Math.PI) / 2)); }
        const t = clamp01((x - hx) / (snout - hx)); return CY - h * (1 - Math.pow(t, 1.7)) - 1 * t;
      };
      const eB = (x: number) => {
        if (x <= hx) { const t = clamp01((x - 22) / (hx - 22)); return CY + (p + (h * 0.92 - p) * Math.sin((t * Math.PI) / 2)); }
        const t = clamp01((x - hx) / (snout - hx)); return CY + h * 0.92 * (1 - Math.pow(t, 2.2)) + 1 * t;
      };
      // ふちに沿ったひれ（付け根は体の内側に少し入れる）
      const finAlong = (top: boolean, x1: number, x2: number, h1: number, h2: number, n = 8) => {
        const e = top ? eT : eB, sg = top ? -1 : 1;
        const pts: string[] = [];
        for (let k = 0; k <= n; k++) {
          const t = k / n, x = x1 + (x2 - x1) * t;
          // 前の方が高く、後ろへ低くなる帆の形
          const hh = t < 0.15 ? h1 * (0.25 + 0.75 * (t / 0.15)) : h1 + (h2 - h1) * Math.pow((t - 0.15) / 0.85, 0.8);
          pts.push(`${x.toFixed(2)} ${(e(x) + sg * Math.max(0.2, hh)).toFixed(2)}`);
        }
        const base = [x2, (x1 + x2) / 2, x1].map((x) => `${x.toFixed(2)} ${(e(x) - sg * 2).toFixed(2)}`);
        return `M${base[2]} L${pts.join(" L")} L${base.join(" L")} Z`;
      };
      const spineH = B === "rock" ? 7.5 : B === "bream" ? 6.5 : 5.5;
      const dorsal = spiny ? (
        <g>
          <path
            d={`M${headX - 2} ${eT(headX - 2) + 2} ${[...Array(9)]
              .map((_, i) => {
                const xt = headX - 3 - i * 3.3, xv = xt - 1.65;
                const L = spineH * (1 - i * 0.05) * (i === 0 ? 0.7 : 1);
                return `L${xt.toFixed(2)} ${(eT(xt) - L).toFixed(2)} L${xv.toFixed(2)} ${(eT(xv) - L * 0.35).toFixed(2)}`;
              })
              .join(" ")} L${headX - 33} ${eT(headX - 33) + 2} Z`}
            {...fin}
          />
          <path d={finAlong(true, headX - 33, Math.max(27, headX - 56), spineH * 0.8, 2.5)} {...fin} />
        </g>
      ) : B === "mackerel" || B === "jack" ? (
        <g>
          <path d={finAlong(true, headX - 6, headX - 18, 7.5, 1, 6)} {...fin} />
          <path d={finAlong(true, headX - 21, headX - 44, 6.5, 1.2)} {...fin} />
          {B === "mackerel" && [...Array(5)].map((_, i) => { const x = headX - 45 - i * 3.2; return <path key={i} d={`M${x} ${eT(x) + 1} l-1.6 -2.6 l-0.6 2.6 Z`} fill={a.fin} />; })}
        </g>
      ) : B === "file" ? (
        <g>
          <path d={`M${headX - 1} ${eT(headX) + 2} L${headX + 1} ${eT(headX) - 9} L${headX - 2.5} ${eT(headX - 2) + 2} Z`} fill={a.back} />
          <path d={finAlong(true, headX - 18, headX - 46, 7, 2)} {...fin} />
        </g>
      ) : (
        <path d={finAlong(true, headX - 12, headX - 34, 6, 1.5)} {...fin} />
      );
      // 尻びれ・腹びれ
      const anal = B === "file" ? <path d={finAlong(false, headX - 18, headX - 46, 7, 2)} {...fin} /> : <path d={finAlong(false, headX - 26, headX - 44, 6, 1.5, 6)} {...fin} />;
      const pelvic = <path d={`M${headX - 2} ${eB(headX - 2) - 2} L${headX - 10} ${eB(headX - 10) + 6} L${headX - 11} ${eB(headX - 11) - 1} Z`} {...fin} />;
      const pectoral = <path d={`M${headX - 1} ${CY + 2} C${headX - 8} ${CY - 1} ${headX - 14} ${CY + 2} ${headX - 16} ${CY + 5} C${headX - 10} ${CY + 6} ${headX - 4} ${CY + 6} ${headX - 1} ${CY + 4} Z`} fill={a.fin} opacity="0.75" />;

      // 模様（体の形で切り抜く）
      let pattern: React.ReactNode = null;
      const xs = (n: number, from: number, to: number) => [...Array(n)].map((_, i) => from + ((to - from) * i) / (n - 1));
      switch (a.pattern) {
        case "scute": // アジのゼイゴ
          pattern = (
            <g>
              <path d={`M${headX} ${CY - 2} C${headX - 20} ${CY - 6} ${headX - 34} ${CY - 1} 24 ${CY}`} stroke={a.pc} strokeWidth="0.9" fill="none" />
              {xs(12, headX - 34, 26).map((x, i) => <path key={i} d={`M${x} ${CY - 1.2} l-1.6 1.2 l1.6 1.2`} stroke={a.pc} strokeWidth="0.7" fill="none" />)}
              <path d={`M${headX} ${CY - 6} C${headX - 24} ${CY - 9} ${headX - 44} ${CY - 6} 28 ${CY - 2}`} stroke={a.accent} strokeWidth="1.1" fill="none" opacity="0.7" />
            </g>
          );
          break;
        case "band":
          pattern = <path d={`M${snout - 4} ${CY - 2} C${headX - 20} ${CY - 4.5} ${headX - 40} ${CY - 3} 22 ${CY - 0.6}`} stroke={a.pc} strokeWidth="2.2" fill="none" opacity="0.9" />;
          break;
        case "wavy": // サバの背の波模様
          pattern = (
            <g>
              {xs(9, headX - 4, 28).map((x, i) => (
                <path key={i} d={`M${x} ${top - 1} q-2 3 0 5 q2 2 -1 5`} stroke={a.pc} strokeWidth="1.3" fill="none" opacity="0.85" />
              ))}
            </g>
          );
          break;
        case "dots":
          pattern = <g>{xs(9, headX - 2, 30).map((x, i) => <circle key={i} cx={x} cy={CY - 1 + (i % 2) * 0.6} r="0.9" fill={a.pc} opacity="0.8" />)}</g>;
          break;
        case "spots":
          pattern = (
            <g>
              {xs(16, headX + 4, 30).map((x, i) => (
                <circle key={i} cx={x + (i % 3)} cy={CY - h * 0.55 + (i % 4) * h * 0.32} r={B === "mackerel" ? 0.9 : 1.2} fill={a.pc} opacity="0.75" />
              ))}
            </g>
          );
          break;
        case "blueSpots": // マダイの青い点
          pattern = <g>{xs(14, headX + 2, 32).map((x, i) => <circle key={i} cx={x} cy={CY - h * 0.6 + (i % 3) * 4} r="0.9" fill={a.pc} />)}</g>;
          break;
        case "bars":
          pattern = <g>{xs(B === "bream" ? 7 : 5, headX + 4, 32).map((x, i) => <path key={i} d={`M${x} ${top - 2} L${x - 3} ${CY + h + 2}`} stroke={a.pc} strokeWidth={species === "イシダイ" ? 4 : 2.2} />)}</g>;
          break;
        case "stripes":
          pattern = <g>{[-0.45, -0.1, 0.25].map((t, i) => <path key={i} d={`M${snout - 6} ${CY + t * h} C${headX - 20} ${CY + t * h - 1} ${headX - 40} ${CY + t * h * 0.6} 24 ${CY + t * p}`} stroke={a.pc} strokeWidth="1" fill="none" opacity="0.8" />)}</g>;
          break;
        case "mottle":
          pattern = (
            <g>
              {xs(10, headX + 6, 30).map((x, i) => (
                <ellipse key={i} cx={x + (i % 2) * 2} cy={CY - h * 0.4 + (i % 3) * h * 0.38} rx="2.6" ry="1.8" fill={a.pc} opacity="0.5" />
              ))}
            </g>
          );
          break;
      }

      art = (
        <g className="fs-bend" style={{ transformOrigin: `${snout}px 30px` }}>
          <clipPath id={clip}>
            <path d={body} />
          </clipPath>
          <g className="fs-tail" style={{ transformOrigin: "23px 30px" }}>
            <path d={tailPath(tail, h, p)} {...fin} />
          </g>
          {dorsal}
          {anal}
          {pelvic}
          <path d={body} fill={`url(#${grad})`} />
          <g clipPath={`url(#${clip})`}>
            {pattern}
            {B !== "file" && <rect x="0" y="0" width={headX - 1} height="60" fill={`url(#${scale})`} />}
            {/* 側線 */}
            {a.pattern !== "scute" && (
              <path d={`M${headX} ${CY - h * 0.45} C${headX - 20} ${CY - h * 0.55} ${headX - 40} ${CY - h * 0.3} 22 ${CY}`} stroke={a.back} strokeWidth="0.5" fill="none" opacity="0.5" />
            )}
            {/* つや */}
            <rect x="0" y={CY - h * 0.35} width="100" height={h * 0.7} fill={`url(#${shine})`} />
            {/* えらぶた */}
            <path d={`M${headX + 1} ${CY - h * 0.7} C${headX - 4} ${CY - h * 0.2} ${headX - 4} ${CY + h * 0.3} ${headX + 2} ${CY + h * 0.8}`} stroke={a.back} strokeWidth="0.9" fill="none" opacity="0.55" />
          </g>
          <g className="fs-pec" style={{ transformOrigin: `${headX - 1}px 32px` }}>{pectoral}</g>
          {/* 口 */}
          <path d={`M${snout} ${CY + 1} L${snout - (B === "rock" ? 7 : B === "bass" ? 6 : 4)} ${CY + 1.8}`} stroke="#2c2c2c" strokeWidth="0.7" opacity="0.7" />
          {B === "rock" && [...Array(4)].map((_, i) => <path key={i} d={`M${headX + 2 + i * 3} ${eyeY - 3.4} l0.8 -2.2`} stroke={a.back} strokeWidth="0.8" />)}
          <Eye x={snout - (B === "rock" ? 10 : B === "file" ? 12 : 8.5)} y={eyeY} r={eyeR} iris={ink ? "#efe7d6" : (B === "jack" ? "#e8d27a" : B === "bream" ? "#d9a24a" : "#c9a24a")} />
        </g>
      );
    }
  }
  return (
    <svg viewBox="0 0 100 60" width={width} height={(width * 60) / 100} aria-label={species} role="img">
      {defs}
      <g fill={g(a.side)} filter={ink ? `url(#${inkF})` : undefined}>{art}</g>
    </svg>
  );
}
