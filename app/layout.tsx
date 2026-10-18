import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Dela_Gothic_One } from "next/font/google";
import Logo from "@/app/components/Logo";
import { SITE } from "@/lib/site";
import "./globals.css";

// ロゴと大見出し用の看板風ゴシック（本文は端末標準のゴシック）
const display = Dela_Gothic_One({ weight: "400", preload: false, display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}｜${SITE.tagline}`, template: `%s｜${SITE.name}` },
  description:
    "関西の海釣り施設・釣り場の釣果、潮汐、ルールをまとめ、今日どこへ行くかを決められる釣り情報サイト。",
  robots: SITE.noindex ? { index: false, follow: false } : undefined,
  // Google Search Console の所有権確認（2026-10-18）
  verification: { google: "xl39BeDzXRGuaDiKHYFv_lAgbz0TiauLuLAuxvbsagw" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10345A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={display.variable}>
      <body>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="logo" aria-label={`${SITE.name} トップへ`}>
              <Logo />
            </Link>
            <nav aria-label="メイン">
              <Link href="/kansai/area/">エリア</Link>
              <Link href="/kansai/">釣り場</Link>
              <Link href="/species/">魚種</Link>
              <Link href="/kansai/month/">月別</Link>
              <Link href="/gear/">道具</Link>
              <Link href="/gear/sale/">セール</Link>
              <Link href="/post/">釣果投稿</Link>
            </nav>
          </div>
          <svg className="header-wave" viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 H1200 V8 C1100 20 1000 20 900 10 S700 0 600 10 S400 22 300 12 S100 2 0 12 Z" />
          </svg>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <ul className="footer-links">
              <li><Link href="/about/">運営者情報</Link></li>
              <li><Link href="/privacy/">プライバシーポリシー</Link></li>
              <li><Link href="/terms/">利用規約</Link></li>
              <li><Link href="/safety/fish/">危険な魚ガイド</Link></li>
              <li><Link href="/disclaimer/">免責事項・安全について</Link></li>
              <li><Link href="/pr-policy/">広告・選定方針</Link></li>
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
