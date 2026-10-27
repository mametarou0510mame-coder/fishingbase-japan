import type { Metadata } from "next";
import Link from "next/link";
import { findGuide } from "@/lib/guides";
import { buildJiai } from "@/lib/jiaiBuild";
import { publishedSpots, spotHref } from "@/lib/spots";

export const metadata: Metadata = {
  title: "はじめての釣り 1回目プラン（関西）",
  description: "釣りがはじめての人向けに、行く場所・釣り方・時間・持ち物・予算を1ページにまとめました。道具を持っていなくても、レンタル竿のある関西の海釣り施設でサビキ釣りから始められます。",
  alternates: { canonical: "/start/" },
};

const dow = (d: string) => "日月火水木金土"[new Date(`${d}T00:00:00Z`).getUTCDay()];
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}(${dow(d)})`;

export default function StartPage() {
  const rental = publishedSpots().filter((s) => s.type === "海釣り施設" && /レンタル竿/.test(s.rentals));
  const jiai = buildJiai();
  const weekend = jiai.dates.filter((d) => [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()));
  const days = weekend.length ? weekend : jiai.dates.slice(0, 2);
  const sabiki = findGuide("sabiki");
  return (
    <>
      <h1>はじめての釣り 1回目プラン</h1>
      <p className="lead">
        「釣りをしてみたいけど、何から始めればいいかわからない」人向けに、最初の1回をまとめました。道具を持っていなくても大丈夫です。
      </p>

      <h2>1. どこへ行く？ → レンタル竿のある海釣り施設</h2>
      <p>はじめては、竿を借りられて、エサも売っていて、トイレと柵がある海釣り施設がいちばん安心です。</p>
      <ul>
        {rental.map((s) => {
          const j = jiai.spots.find((x) => x.slug === s.slug);
          const tips = days
            .map((d) => {
              const w = j?.days[d]?.windows[0];
              return w ? `${md(d)} ${w.grade}${w.from}時〜${w.to}時` : null;
            })
            .filter(Boolean);
          return (
            <li key={s.slug}>
              <Link href={spotHref(s)}>{s.name}</Link> <span className="small">{s.area}</span>
              {tips.length > 0 && <div className="small">ねらい目：{tips.join("／")}</div>}
            </li>
          );
        })}
      </ul>
      <p className="small">ねらい目は、潮の動き・朝夕のまずめ・営業時間・風の予報から計算した当サイト独自の目安です（◎とくにおすすめ、○おすすめ、△まずまず）。</p>

      <h2>2. 何を釣る？ → サビキ釣り</h2>
      <p>
        エサのアミエビを入れたカゴと、小さな針がたくさん付いた仕掛けを、足元に沈めるだけの釣り方です。アジ・イワシ・サバなどの群れが来れば、子どもでも次々に釣れます。投げる必要がないので、最初の1回にぴったりです。
      </p>
      {sabiki && (
        <p>
          <Link href={`/guide/${sabiki.slug}/`}>動画で見る：{sabiki.title} →</Link>
        </p>
      )}

      <h2>3. いつ行く？ → 朝か夕方の「ねらい目」</h2>
      <p>
        魚がよく釣れるのは、日の出・日の入りのころ（まずめ）と、潮がよく動く時間です。上のリストの「ねらい目」や、
        <Link href="/">トップページのランキング</Link>で、行く日の時間を確かめましょう。施設は開園直後が混むので、少し早めに着くと安心です。
      </p>

      <h2>4. 持ち物</h2>
      <ul>
        <li>ライフジャケット（施設で借りられることも多い。子どもは必ず）</li>
        <li>クーラーボックスと氷（釣った魚を持ち帰るなら）</li>
        <li>タオル・ウェットティッシュ・ゴミ袋</li>
        <li>帽子・飲み物・日焼け止め、冬は防寒着</li>
        <li>動きやすく、汚れてもいい服とすべりにくい靴</li>
      </ul>

      <h2>5. いくらかかる？</h2>
      <ul>
        <li>道具を借りる：入場料（大人1,000円前後〜）＋レンタル竿・エサ代。施設の料金ページで確かめてください。</li>
        <li>道具を買う：{sabiki ? sabiki.tackle[0].budget : "5千〜1万円"}（サビキ釣りの初級セット）。2回目以降も使えます。<Link href="/guide/sabiki/">道具リスト</Link></li>
      </ul>

      <h2>6. 安全とマナー</h2>
      <ul>
        <li>ライフジャケットを着る。柵から身を乗り出さない。</li>
        <li>知らない魚はさわらない（<Link href="/safety/fish/">危険な魚ガイド</Link>）。</li>
        <li>ゴミ・釣り糸・針はすべて持ち帰る。施設のルールと係員の案内に従う。</li>
      </ul>

      <h2>釣れたら</h2>
      <p>
        釣った魚は<Link href="/aquarium/">マイ水族館</Link>に登録して、自分だけの水族館を作ってみましょう。
      </p>
    </>
  );
}
