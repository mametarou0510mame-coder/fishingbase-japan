import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FavoriteButton from "@/app/components/FavoriteButton";
import InstallHint from "@/app/components/InstallHint";
import ShioBoard, { type SpeciesTip } from "@/app/components/ShioBoard";
import { areaOfSpot } from "@/lib/areas";
import { summarize } from "@/lib/catches";
import { methodsBySpecies } from "@/lib/patterns";
import { buildBoard } from "@/lib/shioData";
import { SITE } from "@/lib/site";
import { speciesFromCatchName } from "@/lib/species";
import { PREF_LABEL, publishedSpots } from "@/lib/spots";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return publishedSpots().map((s) => ({ slug: s.slug }));
}

const find = (slug: string) => publishedSpots().find((s) => s.slug === slug);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const spot = find((await params).slug);
  if (!spot) return {};
  const path = `/shio/${spot.slug}/`;
  const title = `${spot.name}の潮見表・風・波・釣りどき指数`;
  const desc = `${spot.name}（${spot.area}）のタイドグラフ（潮汐）、3時間ごとの天気・風・波の予報、釣りどき指数と安全の目安を、7日先まで一枚で見られます。`;
  return { title, description: desc, alternates: { canonical: path }, openGraph: { title, description: desc, url: path } };
}

export default async function ShioSpotPage({ params }: { params: Promise<Params> }) {
  const spot = find((await params).slug);
  if (!spot) notFound();
  const area = areaOfSpot(spot.slug);
  const board = buildBoard(spot);
  const summary = summarize([spot.slug]);

  // 魚ごとのおすすめの釣り方（最近の釣果の釣り方＋魚種ページの定番）
  const methods = methodsBySpecies(spot.slug).list;
  const tips: Record<string, SpeciesTip> = {};
  for (const name of new Set(board.days.flatMap((d) => d.species ?? []).map((s) => s.species))) {
    const parts = name.replace(/（.*?）/g, "").split("・");
    const merged = new Map<string, number>();
    for (const m of methods) {
      if (!parts.some((p) => m.species === p || m.species.includes(p))) continue;
      for (const x of m.methods) merged.set(x.name, (merged.get(x.name) ?? 0) + x.count);
    }
    const sp = speciesFromCatchName(name)[0];
    tips[name] = {
      species: name,
      methods: [...merged.entries()].map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count),
      guide: sp ? { slug: sp.slug, name: sp.name, method: sp.methods[0]?.name ?? "" } : null,
    };
  }

  const fmt = (iso: string | null) => {
    if (!iso) return "";
    const t = new Date(new Date(iso).getTime() + 9 * 3600e3);
    return `${t.getUTCMonth() + 1}/${t.getUTCDate()} ${t.getUTCHours()}時`;
  };

  return (
    <article>
      <p className="small">
        <Link href="/shio/">潮・海況</Link> ＞ {area ? area.name : PREF_LABEL[spot.pref]} ＞ {spot.name}
      </p>
      <h1>{spot.name}の潮・海況</h1>
      <p className="lead">
        {spot.area}・{spot.type}。潮位・天気・風・波と、当サイト独自の「釣りどき指数」「安全の目安」を一枚にまとめています。
      </p>
      <p>
        <FavoriteButton slug={spot.slug} />{" "}
        <Link href={`/kansai/${spot.pref}/${spot.slug}/`} className="small">
          料金・ルールなど釣り場の情報へ →
        </Link>
      </p>

      <ShioBoard
        spotName={spot.name}
        spotType={spot.type}
        days={board.days}
        tips={tips}
        recent={summary.list.map((s) => ({ species: s.species, days: s.days, maxSizeCm: s.maxSizeCm }))}
        recentFrom={summary.from}
        recentTo={summary.to}
      />

      <InstallHint />

      <h2>このページのデータについて</h2>
      <ul className="small">
        <li>
          潮位：気象庁「潮位表」の{board.station.name}地点の予測値です。釣り場とは時刻や高さが少しずれることがあります。
        </li>
        <li>
          天気・気温・降水確率：気象庁の予報（{board.weatherLabel}
          {board.weatherReport ? `、${fmt(board.weatherReport)}発表` : ""}）です。
          風：この釣り場の位置の数値予報（ECMWF Open Data・CC BY 4.0、3時間ごとの平均風速）です。気象庁の風の予報は予報区全体の代表で幅が広いため、釣り場ごとの数値予報を使っています。数値予報がない日は府県予報の文から見積もっています（「≧」「約」の印）。突風や地形による強弱はあります。
        </li>
        <li>
          波：
          {board.marine ? (
            <>
              <a href={board.marine.sourceUrl} rel="noopener">
                ECMWF Open Data
              </a>
              （欧州中期予報センターの波浪モデル、{board.marine.resolution}格子、{fmt(board.marine.run)}の計算、CC BY 4.0）から、釣り場に一番近い海の格子（約{board.marine.distKm}km先）の有義波高・周期・向きを当サイトが取り出しています。湾の奥や港の中では実際より高めに出ることがあります。
            </>
          ) : (
            "準備中です（府県予報の波の文から見積もっています）。"
          )}
        </li>
        <li>
          釣りどき指数：潮の動き・まずめ・この釣り場の過去の釣果（季節）・天気から当サイトが計算した目安（0〜100）で、釣果を保証するものではありません。
        </li>
        <li>
          安全の目安：風速・波の高さ・雨・雷から、釣り場の種類ごとの基準で出しています。注意報・警報や現地の状況、施設や渡船店の判断を必ず優先してください。
          <Link href="/disclaimer/">免責事項</Link>
        </li>
      </ul>
      <p className="small">
        <Link href="/shio/">ほかの釣り場の潮・海況を見る</Link>・<Link href="/map/">地図から探す</Link>
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "潮・海況", item: `${SITE.url}/shio/` },
              { "@type": "ListItem", position: 2, name: spot.name, item: `${SITE.url}/shio/${spot.slug}/` },
            ],
          }),
        }}
      />
    </article>
  );
}
