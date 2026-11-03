import type { Metadata } from "next";
import Link from "next/link";
import ShopLinks from "@/app/components/ShopLinks";
import { AFF_SHOPS } from "@/lib/affiliate";
import { SJ_GROUPS } from "@/lib/gearShoreJigging";

export const metadata: Metadata = {
  title: "ショアジギングのおすすめ道具（タックル・ルアー・便利グッズ）",
  description: "関西の堤防・沖堤防で40g前後のジグを投げるショアジギングの道具を、入門〜上級のタックル、ルアー・ライン、便利グッズに分けて紹介します。",
};

export default function ShoreJiggingGearPage() {
  return (
    <article>
      <h1>ショアジギングのおすすめ道具</h1>
      <p className="lead">
        関西の堤防・沖堤防で、40g前後のジグでブリ・サゴシ・サワラを狙う人向けに、選び方の目安と定番の道具をまとめました。
        YouTube の動画（タックル・ルアーとライン・便利グッズの3本）と同じ内容です。
      </p>
      <p className="aff-label">
        <span className="pr">PR</span> {AFF_SHOPS}の広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）。
        運営が使ってみた感想ではなく、メーカーの公表している仕様をもとにした「選び方と定番」の紹介です。価格・在庫はリンク先でご確認ください。
      </p>
      <nav className="small">
        {SJ_GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} style={{ marginRight: "1em" }}>
            {g.title}
          </a>
        ))}
      </nav>
      {SJ_GROUPS.map((g) => (
        <section key={g.id} id={g.id}>
          <h2>{g.title}</h2>
          <p className="small">{g.lead}</p>
          <ul className="gear-links starter">
            {g.picks.map((p) => (
              <li key={p.name}>
                <div>
                  <strong>{p.name}</strong>
                  <br />
                  <span className="small">
                    {p.spec}。{p.why}
                  </span>
                </div>
                <ShopLinks keyword={p.keyword} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="notice">
        堤防・沖堤防では必ずライフジャケットを着けましょう。渡船ごとの決まりは乗る前に、釣り場ごとのルールは各釣り場のページで確認してください。
        <Link href="/gear/">ほかの釣りの道具はこちら</Link>
      </div>
    </article>
  );
}
