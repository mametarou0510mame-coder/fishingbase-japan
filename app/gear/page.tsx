import type { Metadata } from "next";
import Link from "next/link";
import GearList from "@/app/components/GearList";
import ShopLinks from "@/app/components/ShopLinks";
import { AFF_SHOPS } from "@/lib/affiliate";
import { GEAR_INFO, type GearKey } from "@/lib/gear";
import { SPECIES } from "@/lib/species";

export const metadata: Metadata = {
  title: "おすすめの釣り道具（関西の海釣り施設向け）",
  description: "関西の海釣り施設・堤防で使う釣り道具を、はじめての1セットと魚種別に紹介します。釣り場のルールに合う選び方も解説。",
};

const STARTER: { key: GearKey; name: string; why: string }[] = [
  { key: "lifejacket", name: "ライフジャケット（桜マーク付き）", why: "沖堤防（渡船）では桜マーク付きが必須です。どこへ行くにもこれを選べば困りません。" },
  { key: "sabiki-set", name: "サビキ用の竿・リールのセット", why: "2〜3mのリール付きセットなら、海釣り施設の足元の釣りに十分です。" },
  { key: "sabiki-rig", name: "サビキ仕掛け", why: "豆アジの時期は針3〜4号、秋に型が大きくなったら5〜6号が目安です。絡みやすいので予備も。" },
  { key: "chum-cage", name: "アミエビとカゴ", why: "撒き餌が禁止の釣り場（堺・須磨など）では使えません。行く前にルールを確認しましょう。" },
  { key: "cooler", name: "クーラーボックス", why: "10〜20Lが扱いやすい大きさです。渡船では50cmを超えるものを持ち込めない場合があります。" },
  { key: "fish-grip", name: "フィッシュグリップ", why: "ヒレやトゲのある魚、歯の鋭いタチウオを安全につかめます。" },
];

export default function GearPage() {
  return (
    <article>
      <h1>おすすめの釣り道具</h1>
      <p className="lead">
        関西の海釣り施設や堤防で使う道具を、はじめての1セットと魚種別にまとめました。
        商品は「使う場所のルールに合うか」と「初めてでも扱いやすいか」で選んでいます。
      </p>
      <p className="aff-label">
        <span className="pr">PR</span> {AFF_SHOPS}の広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）。
        今どの道具が安いかは<Link href="/gear/sale/">セール・お得情報</Link>をご覧ください。
      </p>

      <h2>はじめての1セット（サビキ釣り）</h2>
      <ul className="gear-links starter">
        {STARTER.map((g) => (
          <li key={g.key}>
            <div>
              <strong>{g.name}</strong>
              <br />
              <span className="small">{g.why}</span>
            </div>
            <ShopLinks keyword={GEAR_INFO[g.key].keyword} />
          </li>
        ))}
      </ul>

      {SPECIES.map((s) => (
        <section key={s.slug}>
          <h2>
            <Link href={`/species/${s.slug}/`}>{s.name}</Link>を釣る道具
          </h2>
          <p className="small">{s.methods.map((m) => m.name).join("・")}で狙います。</p>
          <GearList gear={s.gear} />
        </section>
      ))}

      <div className="notice">
        釣り場ごとに使える道具は違います。各釣り場のページの「この釣り場で使える道具」では、
        ルールで禁止されている道具を除いて表示しています。
      </div>
    </article>
  );
}
