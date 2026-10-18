import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatchSummary from "@/app/components/CatchSummary";
import TideWidget from "@/app/components/TideWidget";
import { areaOfSpot } from "@/lib/areas";
import { DEFAULT_DAYS, monthlyOf, recentReports, sourceOf, summarize } from "@/lib/catches";
import { PREF_LABEL, publishedSpots } from "@/lib/spots";

type Params = { pref: string; slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return publishedSpots().map((s) => ({ pref: s.pref, slug: s.slug }));
}

function findSpot(p: Params) {
  return publishedSpots().find((s) => s.pref === p.pref && s.slug === p.slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const spot = findSpot(await params);
  if (!spot) return {};
  return {
    title: `${spot.name}の潮汐・料金・ルール`,
    description: `${spot.name}（${spot.area}）の今日の潮汐、料金、営業時間、禁止事項をまとめています。`,
  };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export default async function SpotPage({ params }: { params: Promise<Params> }) {
  const spot = findSpot(await params);
  if (!spot) notFound();
  const area = areaOfSpot(spot.slug);
  const source = sourceOf(spot.slug);
  const summary = summarize([spot.slug]);
  const monthly = monthlyOf(spot.slug);
  const recent = recentReports(spot.slug);

  return (
    <article>
      <p className="small">
        <Link href="/kansai/">関西</Link> ＞{" "}
        {area ? <Link href={`/kansai/area/${area.slug}/`}>{area.name}</Link> : PREF_LABEL[spot.pref]} ＞ {spot.name}
      </p>
      <h1>{spot.name}</h1>
      <p className="lead">{spot.intro}</p>

      <h2>今日の潮汐</h2>
      <TideWidget code={spot.tideStation.code} stationName={spot.tideStation.name} />

      <h2>基本情報</h2>
      <table>
        <tbody>
          <tr><th>所在地</th><td>{spot.address}</td></tr>
          {spot.hours && <tr><th>営業時間</th><td>{spot.hours}</td></tr>}
          {spot.closed && <tr><th>休業日</th><td>{spot.closed}</td></tr>}
          {spot.fees.map((f) => (
            <tr key={f.label}><th>{f.label}</th><td>{f.value}</td></tr>
          ))}
          {spot.parking && <tr><th>駐車場</th><td>{spot.parking}</td></tr>}
          {spot.rentals && <tr><th>レンタル・売店</th><td>{spot.rentals}</td></tr>}
        </tbody>
      </table>

      {spot.level === "basic" && (
        <div className="notice">
          <strong>料金・営業時間・ルールはリンク先でご確認ください</strong>
          <br />
          この釣り場は、当サイトで最新のルールまで確認できていないため、概要のみ掲載しています。
          お出かけ前に<a href={spot.officialUrl} rel="noopener">施設のサイト</a>
          {spot.sourceUrls.map((u) => (
            <span key={u}>
              、<a href={u} rel="noopener">案内ページ（{new URL(u).hostname}）</a>
            </span>
          ))}
          で、料金・営業時間・禁止事項をご確認ください。
        </div>
      )}

      {spot.rules.length > 0 && (
        <>
          <h2>ルール・禁止事項</h2>
          <ul>
            {spot.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      {spot.notes.map((n) => (
        <p key={n} className="small">{n}</p>
      ))}

      {source ? (
        <>
          <h2>最近釣れている魚</h2>
          <p className="small">
            直近{DEFAULT_DAYS}日間に施設が公開した釣果の集計です（出典：
            <a href={source.url} rel="noopener">{source.name}</a>）。
          </p>
          <CatchSummary list={summary.list} />
          {monthly && monthly.rows.length > 0 && (
            <>
              <h3>施設発表の今月の釣果</h3>
              <table className="catch-table">
                <thead>
                  <tr><th>魚種</th><th>評価</th><th>サイズ(cm)</th><th>1人あたり</th><th>仕掛け</th></tr>
                </thead>
                <tbody>
                  {monthly.rows.map((r) => (
                    <tr key={r.species + r.method}>
                      <td>{r.species}</td>
                      <td>{"★".repeat(r.stars) || "―"}</td>
                      <td>{r.size}</td>
                      <td>{r.perPerson}</td>
                      <td>{r.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {recent.length > 0 && (
            <>
              <h3>最近の報告</h3>
              <ul className="small">
                {recent.map((r) => (
                  <li key={r.id}>
                    {r.date.slice(5).replace("-", "/")}　{r.species}
                    {r.sizeCm !== null && ` ${r.sizeCm}cm`}
                    {r.method && `（${r.method}）`}　<a href={r.url} rel="noopener">元の記事</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        spot.catchReportUrl && (
          <>
            <h2>最近の釣果</h2>
            <p>
              施設が公開している最新の釣果は、
              <a href={spot.catchReportUrl} rel="noopener">{spot.name}の釣果ページ（公式）</a>
              でご覧いただけます。
            </p>
          </>
        )
      )}

      <div className="notice">
        <strong>
          {spot.level === "full" ? "最終確認日" : "リンク確認日"}：{formatDate(spot.verifiedOn)}
        </strong>
        <br />
        料金・営業時間・ルールは変わることがあります。お出かけ前に必ず
        <a href={spot.officialUrl} rel="noopener">公式サイト</a>
        でご確認ください。
      </div>

      <p className="small">
        出典：
        {spot.sourceUrls.map((u, i) => (
          <span key={u}>
            {i > 0 && "、"}
            <a href={u} rel="noopener">{new URL(u).hostname}</a>
          </span>
        ))}
      </p>
    </article>
  );
}
