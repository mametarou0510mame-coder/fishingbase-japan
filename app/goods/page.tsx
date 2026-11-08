import type { Metadata } from "next";
import Link from "next/link";

// ツレドキのオリジナルグッズ（SUZURI で販売）。値段は content/goods/README.md の「価格の決め方」に合わせる。
// 値段を変えたら、このページと content/goods/spec-*.json の両方を直す。
export const metadata: Metadata = {
  title: "ツレドキ オリジナルグッズ（Tシャツ・パーカー）",
  description: "朝日の水平線、ぶち曲がる竿、跳ねるブリ。釣り場で着られるツレドキのオリジナルTシャツ（ドライ生地）とパーカーです。SUZURI で販売しています。",
  alternates: { canonical: "/goods/" },
};

const SHOP = "https://suzuri.jp/Tsuredoki";

type Item = {
  name: string;
  img: string;
  alt: string;
  note: string;
  buys: { label: string; price: string; href: string }[];
};

const ITEMS: Item[] = [
  {
    name: "Tシャツ「朝日とブリ」（ドライ生地）",
    img: "/goods/tee-3colors.webp",
    alt: "ツレドキのTシャツ。白・アイスグレー・黒の3色。胸に TSUREDOKI の文字、朝日と曲がった竿と跳ねるブリの絵",
    note: "汗をかいてもさらっと乾くドライ生地（United Athle 4.1オンス）。前にプリント。S〜5XL。",
    buys: [
      { label: "ホワイト・アイスグレー", price: "2,816円", href: "https://suzuri.jp/Tsuredoki/21327969/united-athle-4-1oz-dry-athletic-t-shirt-for-shop/m/white" },
      { label: "ブラック", price: "2,816円", href: "https://suzuri.jp/Tsuredoki/21327970/united-athle-4-1oz-dry-athletic-t-shirt-for-shop/m/black" },
    ],
  },
  {
    name: "パーカー「朝日とブリ」",
    img: "/goods/hoodie-samples.webp",
    alt: "パーカーの背中（左：ナチュラル、右：ネイビー）。TSUREDOKI の文字、朝日、曲がった竿、跳ねるブリのプリント",
    note: "右胸にブリと TSUREDOKI の小さなマーク、背中に朝日とブリの大きなプリント。裏地はパイル。",
    buys: [
      { label: "明るい色（ナチュラルなど）", price: "6,098円", href: "https://suzuri.jp/Tsuredoki/21328445/hoodie/m/natural" },
      { label: "濃い色（ネイビーなど）", price: "6,798円", href: "https://suzuri.jp/Tsuredoki/21328447/hoodie/m/navy" },
    ],
  },
];

export default function GoodsPage() {
  return (
    <div className="links-page">
      <h1>ツレドキ オリジナルグッズ</h1>
      <p className="lead">朝日の水平線、ぶち曲がる竿、跳ねるブリ。釣り場で着られるデザインにしました。</p>

      {ITEMS.map((it) => (
        <section key={it.name}>
          <h2>{it.name}</h2>
          <img src={it.img} alt={it.alt} style={{ width: "100%", height: "auto", borderRadius: 12 }} loading="lazy" />
          <p className="small">{it.note}</p>
          <div className="link-list">
            {it.buys.map((b) => (
              <a key={b.href} className="link-btn" href={b.href} rel="noopener" target="_blank">
                {b.label}　{b.price}（税込）→ SUZURI
              </a>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2>買う前に</h2>
        <ul className="small">
          <li>販売・発送は SUZURI（スズリ）が行います。値段は基本のサイズの税込価格で、大きいサイズは少し高くなります。送料・在庫・お届け日はリンク先でご確認ください。</li>
          <li>色によってプリントの色が変わります。リンク先でプレビューを見てからお選びください。</li>
          <li>売上の一部はツレドキの運営費になります。</li>
        </ul>
        <div className="link-list">
          <a className="link-btn" href={SHOP} rel="noopener" target="_blank">SUZURI のツレドキのお店を見る</a>
        </div>
        <p className="small">「こんなデザインが欲しい」などのご意見は <Link href="/request/">要望の書き込み箱</Link> へどうぞ。</p>
      </section>
    </div>
  );
}
