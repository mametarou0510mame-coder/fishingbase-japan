import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { speciesInMonth } from "@/lib/species";
import { publishedSpots, spotHref } from "@/lib/spots";

type Params = { month: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1) }));
}

function parseMonth(p: Params): number | null {
  const m = Number(p.month);
  return Number.isInteger(m) && m >= 1 && m <= 12 ? m : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const m = parseMonth(await params);
  if (!m) return {};
  const names = speciesInMonth(m).map((s) => s.name.replace(/（.*）/, ""));
  return {
    title: `${m}月に関西で釣れる魚`,
    description: `${m}月の関西の海釣りで狙いやすい魚（${names.join("・")}）と、釣り方・時間帯の目安、釣り場をまとめています。`,
  };
}

export default async function MonthPage({ params }: { params: Promise<Params> }) {
  const m = parseMonth(await params);
  if (!m) notFound();
  const list = speciesInMonth(m);
  const peak = list.filter((s) => s.peakMonths.includes(m));
  const other = list.filter((s) => !s.peakMonths.includes(m));
  const prev = m === 1 ? 12 : m - 1;
  const next = m === 12 ? 1 : m + 1;
  const spotsWithReports = publishedSpots().filter((s) => s.catchReportUrl);

  return (
    <article>
      <p className="small">
        <Link href="/kansai/month/">月別</Link> ＞ {m}月
      </p>
      <h1>{m}月に関西で釣れる魚</h1>
      <p className="lead">
        {m}月の関西の岸釣りで狙いやすい魚の目安です。
        {peak.length > 0 && `特に${peak.map((s) => s.name).join("・")}がよい時期です。`}
      </p>

      {peak.length > 0 && (
        <>
          <h2>特によい時期の魚</h2>
          <div className="cards">
            {peak.map((s) => (
              <Link key={s.slug} href={`/species/${s.slug}/`} className="card card-link">
                <h3>{s.name}</h3>
                <p>{s.methods.map((x) => x.name).join("・")}</p>
                <p>{s.bestTime}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {other.length > 0 && (
        <>
          <h2>ほかに狙える魚</h2>
          <div className="cards">
            {other.map((s) => (
              <Link key={s.slug} href={`/species/${s.slug}/`} className="card card-link">
                <h3>{s.name}</h3>
                <p>{s.methods.map((x) => x.name).join("・")}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="small">時期は一般的な目安です。その年の水温や潮によって前後します。</p>

      {spotsWithReports.length > 0 && (
        <>
          <h2>最新の釣果を確認する</h2>
          <p>実際に今釣れているかは、施設が公開している釣果ページで確認するのが確実です。</p>
          <ul>
            {spotsWithReports.map((s) => (
              <li key={s.slug}>
                <a href={s.catchReportUrl} rel="noopener">{s.name}の釣果（公式）</a>
                　／　<Link href={spotHref(s)}>潮汐・料金・ルール</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p>
        <Link href={`/kansai/month/${prev}/`}>← {prev}月</Link>
        <Link href={`/kansai/month/${next}/`}>{next}月 →</Link>
      </p>
    </article>
  );
}
