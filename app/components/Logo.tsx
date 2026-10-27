// ツレドキのロゴ。波に浮かぶウキ（上半分が赤）をマークにしたオリジナルデザイン。
export function FloatMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="float-mark">
      {/* 竿先へ伸びる糸 */}
      <line x1="16" y1="1.5" x2="16" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* ウキの上半分（赤） */}
      <path d="M16 5 C20.5 9 21 14 21 17 L11 17 C11 14 11.5 9 16 5 Z" fill="#E3412B" />
      {/* ウキの下半分（白） */}
      <path d="M11 17 L21 17 C21 21 19 25 16 27 C13 25 11 21 11 17 Z" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
      {/* 水面（潮の波） */}
      <path d="M1 19.5 C5 17, 8 22, 12 19.5 S 20 17, 24 19.5 S 30 22, 31 19.5" fill="none" stroke="#5FC3C9" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo-lockup">
      <FloatMark />
      <span className="logo-word">ツレドキ</span>
    </span>
  );
}
