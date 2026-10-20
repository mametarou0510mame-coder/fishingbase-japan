import type { Metadata } from "next";
import Link from "next/link";
import NOTICES from "@/content/notices.json";
import { publishedSpots, type Spot } from "@/lib/spots";

export const metadata: Metadata = {
  title: "釣り場の更新情報（休園・再開・ルール変更）",
  description: "関西の釣り場の休園・再開・ルール変更・新しく掲載した釣り場を、日付と公式情報の出典つきでまとめています。",
  alternates: { canonical: "/news/" },
};

type Notice = { date: string; kind: string; spot?: string; text: string; source: string };
const fmt = (d: string) => d.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, "$1年$2月$3日");

export default function NewsPage() {
  const spots = publishedSpots();
  const bySlug = new Map(spots.map((s) => [s.slug, s] as [string, Spot]));
  const items = (NOTICES.items as Notice[]).slice().sort((a, b) => b.date.localeCompare(a.date));
  const checked = spots.slice().sort((a, b) => b.verifiedOn.localeCompare(a.verifiedOn)).slice(0, 15);
  return (
    <>
      <h1>釣り場の更新情報</h1>
      <p className="lead">
        休園・再開・ルール変更・新しく掲載した釣り場を、日付と出典（公式情報）つきで記録しています。釣り禁止になった場所は掲載から外し、ここでお知らせします。
      </p>
      <h2>お知らせ</h2>
      <ul className="news-list">
        {items.map((n, i) => {
          const s = n.spot ? bySlug.get(n.spot) : undefined;
          return (
            <li key={i}>
              <span className="small">{fmt(n.date)}</span> <span className="tag">{n.kind}</span>{" "}
              {s ? <Link href={`/kansai/${s.pref}/${s.slug}/`}>{s.name}</Link> : null}
              <div>{n.text}</div>
              <a className="small" href={n.source} rel="noopener">出典</a>
            </li>
          );
        })}
      </ul>
      <h2>最近、公式情報を確認した釣り場</h2>
      <ul>
        {checked.map((s) => (
          <li key={s.slug}>
            <Link href={`/kansai/${s.pref}/${s.slug}/`}>{s.name}</Link> <span className="small">{fmt(s.verifiedOn)} 確認</span>
          </li>
        ))}
      </ul>
      <p className="small">料金・時間・ルールは変わることがあります。お出かけ前に各釣り場の公式情報と現地の掲示をご確認ください。</p>
    </>
  );
}
