import Link from "next/link";
import JiaiRanking from "@/app/components/JiaiRanking";
import ThisMonthLink from "@/app/components/ThisMonthLink";
import { buildJiai } from "@/lib/jiaiBuild";
import { AREAS } from "@/lib/areas";
import { summarize } from "@/lib/catches";
import SocialFollow from "@/app/components/SocialFollow";
import { guides, type Guide } from "@/lib/guides";
import { SITE } from "@/lib/site";
import { publishedSpots } from "@/lib/spots";

const FAQ: { q: string; a: string }[] = [
  { q: "ツレドキ関西はどんなサイトですか？", a: "大阪湾・神戸・明石・和歌山などの釣り場ごとに、最近の釣果、潮の動き、時間ごとの天気と風、料金やルールを1ページにまとめた無料の釣り情報サイトです。" },
  { q: "「今日のねらい目」はどうやって決めていますか？", a: "気象庁の潮位表から潮がよく動く時間を、日の出・日の入りの時刻から朝夕のまずめを求め、釣り場の営業時間と風の予報を組み合わせて計算した目安です。" },
  { q: "釣果情報はどこから集めていますか？", a: "海釣り施設・渡船・釣具店が公開している釣果を毎日集計しています。各釣り場のページに出典のリンクを載せています。" },
  { q: "初心者におすすめの釣り場はどこですか？", a: "手すり・トイレ・レンタル竿がある海釣り施設が安心です。「条件で釣り場を探す」でレンタル竿ありの釣り場を絞り込めます。釣り方は「釣り方ガイド」で動画つきで紹介しています。" },
  { q: "利用に料金はかかりますか？", a: "無料でご利用いただけます。サイトは広告（アフィリエイト）の収益で運営しています。" },
  { q: "立入禁止の場所も載っていますか？", a: "載せていません。立入禁止区域や、管理者が釣りを認めていない場所は紹介しない方針です。現地の掲示やルールも必ずご確認ください。" },
];

export default function Home() {
  const spotCount = publishedSpots().length;
  const jiai = buildJiai();
  const gs = guides();
  const picks = ["sabiki", "choinage", "anazuri", "shore-jigging", "eging", "ajing"].map((k) => gs.find((g) => g.slug === k)).filter((g): g is Guide => !!g);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/og.png`,
      sameAs: [SITE.instagram, SITE.youtube],
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, inLanguage: "ja" },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero">
        <h1><span className="nb">今日はどこで、</span><span className="nb">何時に釣る？</span></h1>
        <p>
          関西の海釣り施設・釣り場{spotCount}か所の、最近の釣果、潮がよく動く時間、時間ごとの天気・風、料金とルールを1ページずつにまとめています。
        </p>
      </section>

      <JiaiRanking dates={jiai.dates} spots={jiai.spots} />

      <h2>探す</h2>
      <ul className="quick-links">
        <li><Link href="/kansai/area/">エリア別：最近釣れている魚</Link></li>
        <li><Link href="/kansai/">条件で釣り場を探す</Link></li>
        <li><ThisMonthLink /></li>
        <li><Link href="/species/">魚種から探す</Link></li>
        <li><Link href="/safety/fish/">危険な魚ガイド</Link></li>
      </ul>

      <h2>はじめての人へ：釣り方ガイド</h2>
      <div className="cards">
        {picks.map((g) => (
          <Link key={g.slug} href={`/guide/${g.slug}/`} className="card card-link">
            <h3>{g.title}</h3>
            <p>{g.sub}。{g.targets.slice(0, 3).join("、")}など</p>
          </Link>
        ))}
      </div>
      <p>
        <Link href="/guide/">釣り方ガイドをすべて見る（全{gs.length}本・動画つき）</Link>
      </p>

      <div className="card aq-promo">
        <h3>
          <Link href="/aquarium/">マイ水族館</Link>：釣った魚を登録して、あなただけの水族館に
        </h3>
        <p>アバターを作って、釣った魚を入れると水槽で泳ぎ出します。図鑑とバッジも集められます（ログイン不要）。</p>
      </div>

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

      <h2>よくある質問</h2>
      <dl className="faq">
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt>{f.q}</dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
