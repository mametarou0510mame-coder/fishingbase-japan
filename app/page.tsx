import Link from "next/link";
import ThisMonthLink from "@/app/components/ThisMonthLink";
import { AREAS } from "@/lib/areas";
import { summarize } from "@/lib/catches";
import { SITE } from "@/lib/site";
import { publishedSpots } from "@/lib/spots";

export default function Home() {
  const spotCount = publishedSpots().length;
  return (
    <>
      <section className="hero">
        <h1><span className="nb">今日はどこで、</span><span className="nb">何時に釣る？</span></h1>
        <p>
          関西の海釣り施設・釣り場{spotCount}か所の、最近の釣果、潮がよく動く時間、時間ごとの天気・風、料金とルールを1ページずつにまとめています。
        </p>
      </section>

      <ul className="quick-links">
        <li><Link href="/kansai/area/">エリア別：最近釣れている魚</Link></li>
        <li><Link href="/kansai/">関西の釣り場一覧</Link></li>
        <li><ThisMonthLink /></li>
        <li><Link href="/species/">魚種から探す</Link></li>
      </ul>

      <h2>エリア</h2>
      <div className="cards">
        {AREAS.map((a) => {
          const top = summarize(a.spots).list.slice(0, 3);
          return (
            <Link key={a.slug} href={`/kansai/area/${a.slug}/`} className="card card-link">
              <h3>{a.name}</h3>
              <p>{a.region}</p>
              {top.length > 0 && <p>最近：{top.map((t) => t.species.replace(/（.*）/, "")).join("、")}</p>}
            </Link>
          );
        })}
      </div>

      <h2>このサイトでわかること</h2>
      <div className="cards">
        <div className="card">
          <h3>最近釣れている魚</h3>
          <p>海釣り施設・渡船が公開している釣果を毎日集計し、エリア・釣り場ごとに表示します。</p>
        </div>
        <div className="card">
          <h3>タイドグラフと潮の動き</h3>
          <p>気象庁の潮位表をもとに、満潮・干潮、潮がよく動く時間、日の出・日の入を表示します。</p>
        </div>
        <div className="card">
          <h3>天気・風・波</h3>
          <p>気象庁の予報を1日3回取り込み、3時間ごとの天気・風・気温と波を表示します。</p>
        </div>
        <div className="card">
          <h3>料金・ルール</h3>
          <p>料金・営業時間・禁止事項を、確認日と出典つきで掲載しています。</p>
        </div>
      </div>

      <div className="notice">
        当サイトは立入禁止区域や、管理者が釣りを認めていない場所は紹介しません。
        詳しくは<Link href="/disclaimer/">免責事項・安全について</Link>をご覧ください。
      </div>

      <p className="small">
        最新情報は <a href={SITE.instagram} rel="noopener">Instagram（{SITE.instagramHandle}）</a> でお知らせします。
      </p>
    </>
  );
}
