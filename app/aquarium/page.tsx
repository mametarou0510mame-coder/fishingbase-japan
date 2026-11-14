import type { Metadata } from "next";
import Link from "next/link";

// マイ水族館は 2026-11-15 で終了し、「魚拓・釣果記録」（/gyotaku/）に移した。前の記録は同じ端末ならそのまま見られる。
export const metadata: Metadata = {
  title: "マイ水族館は「魚拓・釣果記録」になりました",
  robots: { index: false, follow: true },
  alternates: { canonical: "/gyotaku/" },
};

export default function AquariumMoved() {
  return (
    <article>
      <meta httpEquiv="refresh" content="0; url=/gyotaku/" />
      <h1>マイ水族館は「魚拓・釣果記録」になりました</h1>
      <p>登録した釣果と写真は、同じ端末・同じブラウザなら、そのまま「魚拓・釣果記録」で見られます。</p>
      <div className="link-list">
        <Link className="link-btn" href="/gyotaku/">魚拓・釣果記録へ</Link>
      </div>
    </article>
  );
}
