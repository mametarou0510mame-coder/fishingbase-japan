// マイ水族館の釣り人アバター（帽子・服・肌・表情を選べる）
export type AvatarConf = { hat: string; jacket: string; skin: string; face: "smile" | "cool" | "wow"; cap: "cap" | "bucket" | "none" };

export const AVATAR_DEFAULT: AvatarConf = { hat: "#e3412b", jacket: "#10345a", skin: "#f2c9a5", face: "smile", cap: "cap" };
export const HAT_COLORS = ["#e3412b", "#f2b630", "#2e8b57", "#10345a", "#ffffff", "#8a5cd6"];
export const JACKET_COLORS = ["#10345a", "#e3412b", "#f08c2b", "#3a7d44", "#6b6f76", "#2a9dc4"];
export const SKIN_COLORS = ["#f6d8bf", "#f2c9a5", "#d9a37c", "#a8714f"];

export default function Avatar({ c, size = 120 }: { c: AvatarConf; size?: number }) {
  return (
    <svg viewBox="0 0 100 120" width={size} height={(size * 120) / 100} role="img" aria-label="あなたのアバター">
      {/* 竿 */}
      <path d="M70 70 L98 6" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M98 6 Q99 40 96 80" stroke="#888" strokeWidth="0.8" fill="none" />
      {/* ライフジャケット付きの体 */}
      <path d="M28 118 Q28 78 50 74 Q72 78 72 118 Z" fill={c.jacket} />
      <path d="M38 80 L50 96 L62 80" stroke="#f2b630" strokeWidth="5" fill="none" strokeLinejoin="round" />
      <rect x="35" y="98" width="30" height="5" rx="2" fill="#f2b630" />
      {/* 腕 */}
      <path d="M64 84 Q72 80 72 70" stroke={c.jacket} strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="71" cy="69" r="4.5" fill={c.skin} />
      {/* 顔 */}
      <circle cx="50" cy="52" r="20" fill={c.skin} />
      {c.face === "cool" ? (
        <>
          <rect x="35" y="45" width="13" height="7" rx="3" fill="#1d2733" />
          <rect x="52" y="45" width="13" height="7" rx="3" fill="#1d2733" />
          <path d="M48 48 L52 48" stroke="#1d2733" strokeWidth="2" />
          <path d="M43 61 Q50 64 57 61" stroke="#7a3b2e" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="43" cy="50" r="2.4" fill="#1d2733" />
          <circle cx="57" cy="50" r="2.4" fill="#1d2733" />
          {c.face === "wow" ? (
            <ellipse cx="50" cy="61" rx="3.5" ry="4.5" fill="#7a3b2e" />
          ) : (
            <path d="M42 58 Q50 66 58 58" stroke="#7a3b2e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          )}
          <circle cx="38" cy="57" r="3" fill="#f29b8a" opacity="0.6" />
          <circle cx="62" cy="57" r="3" fill="#f29b8a" opacity="0.6" />
        </>
      )}
      {/* 帽子 */}
      {c.cap === "cap" && (
        <>
          <path d="M30 44 Q30 28 50 28 Q70 28 70 44 Z" fill={c.hat} />
          <path d="M60 43 Q78 42 82 46 L62 47 Z" fill={c.hat} />
        </>
      )}
      {c.cap === "bucket" && (
        <>
          <path d="M33 42 Q34 27 50 27 Q66 27 67 42 Z" fill={c.hat} />
          <path d="M26 44 Q50 36 74 44 Q50 48 26 44 Z" fill={c.hat} />
        </>
      )}
    </svg>
  );
}
