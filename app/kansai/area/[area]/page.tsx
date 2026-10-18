import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatchSummary from "@/app/components/CatchSummary";
import { AREAS, findArea } from "@/lib/areas";
import { DEFAULT_DAYS, hasCatchSource, monthlyOf, sourceOf, sourcesOf, summarize } from "@/lib/catches";
import { speciesInMonth } from "@/lib/species";
import { indexFor } from "@/lib/fishingIndex";
import { SPOTS } from "@/lib/spots";

type Params = { area: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return AREAS.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const a = findArea((await params).area);
  if (!a) return {};
  return {
    title: `${a.name}の釣果・釣り場情報（${a.region}）`,
    description: `${a.name}エリア（${a.region}）で最近釣れている魚を施設の公式釣果から集計。釣り場ごとの釣果と、潮汐・ルールのページへのリンクをまとめています。`,
  };
}

function fmt(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
}

export default async function AreaPage({ params }: { params: Promise<Params> }) {
  const area = findArea((await params).area);
  if (!area) notFound();
  const spots = area.spots
    .map((slug) => SPOTS.find((s) => s.slug === slug && s.published))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const names = Object.fromEntries(spots.map((s) => [s.slug, s.name]));
  const total = summarize(area.spots);
  const withData = spots.filter((s) => hasCatchSource(s.slug));
  const indexed = spots
    .map((spot) => ({ spot, data: indexFor(spot.slug).data }))
    .filter((x): x is { spot: (typeof spots)[number]; data: NonNullable<typeof x.data> } => x.data !== null && x.data.days.length > 0);
  const month = Number((total.to ?? new Date(Date.now() + 9 * 3600 * 1000).toISOString()).slice(5, 7));

  return (
    <article>
      <p className="small">
        <Link href="/kansai/area/">エリア別</Link> ＞ {area.name}
      </p>
      <h1>{area.name}の釣り情報</h1>
      <p className="lead">
        {area.region}。{area.intro}
      </p>

      {indexed.length > 0 && (
        <>
          <h2>今日の釣れ指数</h2>
          <ul>
            {indexed.map(({ spot, data }) => (
              <li key={spot.slug}>
                <Link href={`/kansai/${spot.pref}/${spot.slug}/`}>{spot.name}</Link>：
                {data.days[0].top
                  .filter((t) => t.index >= 5)
                  .slice(0, 3)
                  .map((t) => `${t.species.replace(/（.*）/, "")} ${t.index}`)
                  .join("、")}
              </li>
            ))}
          </ul>
          <p className="small">釣れ指数は過去の公開釣果から計算した目安です（詳しくは各釣り場のページ）。</p>
        </>
      )}

      <h2>エリアで最近釣れている魚</h2>
      {withData.length > 0 ? (
        <>
          <p className="small">
            直近{DEFAULT_DAYS}日間（{fmt(total.from)}〜{total.to ? fmt(total.to) : ""}）に、
            {withData.map((s) => s.name).join("・")}が公式サイトで公開した釣果を集計しています。
          </p>
          <CatchSummary list={total.list} spotNames={names} showSpots={withData.length > 1} />
        </>
      ) : (
        <p>このエリアの釣り場は、まだ釣果の自動集計に対応していません。各釣り場のページから施設のサイトをご確認ください。</p>
      )}

      <h2>釣り場ごとの釣果</h2>
      {spots.map((s) => {
        const sum = summarize([s.slug]);
        const src = sourceOf(s.slug);
        const monthly = monthlyOf(s.slug);
        return (
          <section key={s.slug} className="card spot-catch">
            <h3>
              <Link href={`/kansai/${s.pref}/${s.slug}/`}>{s.name}</Link>
            </h3>
            {src ? (
              <>
                {sum.list.length > 0 ? (
                  <p>
                    最近の釣果：
                    {sum.list
                      .slice(0, 5)
                      .map((x) => `${x.species.replace(/（.*）/, "")}（${x.days}日）`)
                      .join("、")}
                  </p>
                ) : (
                  <p className="small">直近{DEFAULT_DAYS}日間の報告はありません。</p>
                )}
                {monthly && monthly.rows.length > 0 && (
                  <p className="small">
                    施設発表の今月の評価：
                    {monthly.rows
                      .filter((r) => r.stars > 0)
                      .sort((a, b) => b.stars - a.stars)
                      .slice(0, 5)
                      .map((r) => `${r.species.replace(/（.*）/, "")} ${"★".repeat(r.stars)}`)
                      .join("、")}
                  </p>
                )}
                <p className="small">
                  出典：
                  {sourcesOf(s.slug).map((x, i) => (
                    <span key={x.url}>
                      {i > 0 && "、"}
                      <a href={x.url} rel="noopener">{x.name}</a>
                    </span>
                  ))}
                </p>
              </>
            ) : (
              <p className="small">
                釣果の自動集計は未対応です。
                {s.catchReportUrl ? (
                  <a href={s.catchReportUrl} rel="noopener">施設の釣果ページ</a>
                ) : (
                  <a href={s.officialUrl} rel="noopener">施設のサイト</a>
                )}
                でご確認ください。
              </p>
            )}
          </section>
        );
      })}

      <h2>{month}月に狙いやすい魚（目安）</h2>
      <p>
        {speciesInMonth(month).map((s, i) => (
          <span key={s.slug}>
            {i > 0 && "・"}
            <Link href={`/species/${s.slug}/`}>{s.name}</Link>
          </span>
        ))}
        　<Link href={`/kansai/month/${month}/`}>{month}月のまとめ →</Link>
      </p>

      <p className="small">
        集計について：施設が公開している釣果情報から、日付・魚種・サイズ・尾数・仕掛けだけを取り出して集計しています（投稿者の名前や写真は取得していません）。
        釣果の報告は大物や釣れた日に偏りやすいため、目安としてご覧ください。
      </p>
    </article>
  );
}
