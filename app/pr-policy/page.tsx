import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `広告・おすすめ商品の選定方針 | ${SITE.name}`,
  description: `${SITE.name}が釣り具などの商品を紹介するときの選び方と、広告表示についての方針です。`,
};

export default function PrPolicy() {
  return (
    <article>
      <h1>広告・おすすめ商品の選定方針</h1>
      <p>
        {SITE.name}は、Amazonアソシエイト・楽天アフィリエイト・もしもアフィリエイトなどのアフィリエイトプログラムに参加しています（参加予定のものを含みます）。
        紹介した商品が購入されると、当サイトが販売店から紹介料を受け取ることがあります。お客様の購入金額は変わりません。
      </p>

      <h2>表示のしかた</h2>
      <ul>
        <li>広告リンクを含む枠には、必ず「PR」と表示します。</li>
        <li>釣果・潮・天気・釣れ指数などの情報は、広告の有無によって内容を変えません。</li>
      </ul>

      <h2>商品の選び方</h2>
      <ul>
        <li>その釣り場のルールで使えるものだけを紹介します（例：コマセ禁止の釣り場ではコマセ用の道具を出しません）。</li>
        <li>ライフジャケットは、釣り場が求める基準（桜マークなど）を満たすものを優先します。</li>
        <li>その釣り場・時期に釣れている魚と、初めての方でも扱いやすいかどうかを基準にします。</li>
        <li>紹介料の高さでは選びません。</li>
        <li>価格・在庫は変わるため、購入前に販売ページでご確認ください。リンクは定期的に確認します。</li>
      </ul>

      <p className="small">
        お気づきの点は<Link href="/contact/">お問い合わせ</Link>からお知らせください。最終更新：{SITE.policyUpdated}
      </p>
    </article>
  );
}
