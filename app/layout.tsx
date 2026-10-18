import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}｜${SITE.tagline}`, template: `%s｜${SITE.name}` },
  description:
    "関西の海釣り施設・釣り場の釣果、潮汐、ルールをまとめ、今日どこへ行くかを決められる釣り情報サイト。",
  robots: SITE.noindex ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b3d5c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden="true">◢</span>
              {SITE.name}
            </Link>
            <nav aria-label="メイン">
              <Link href="/kansai/area/">エリア</Link>
              <Link href="/kansai/">釣り場</Link>
              <Link href="/species/">魚種</Link>
              <Link href="/kansai/month/">月別</Link>
              <Link href="/contact/">お問い合わせ</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <ul className="footer-links">
              <li><Link href="/about/">運営者情報</Link></li>
              <li><Link href="/privacy/">プライバシーポリシー</Link></li>
              <li><Link href="/terms/">利用規約</Link></li>
              <li><Link href="/disclaimer/">免責事項・安全について</Link></li>
              <li><Link href="/data-deletion/">データ削除のご依頼</Link></li>
              <li><Link href="/contact/">お問い合わせ</Link></li>
            </ul>
            <p className="small">
              立入禁止区域・漁港の作業区域では釣りをしないでください。ライフジャケットを必ず着用しましょう。
            </p>
            <p className="small">© 2026 {SITE.name}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
