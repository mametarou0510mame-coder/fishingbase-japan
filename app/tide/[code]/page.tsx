import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TideViewer from "@/app/components/TideViewer";
import { publishedSpots, spotHref } from "@/lib/spots";
import { TIDE_STATIONS, codeFromSlug, nearestStation, obsOffset, stationByCode, stationSlug } from "@/lib/tideStations";
import { spotLatLon } from "@/lib/shioData";

type Params = { code: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return TIDE_STATIONS.map((s) => ({ code: stationSlug(s.code) }));
}

const find = (slug: string) => {
  const c = codeFromSlug(slug);
  return c ? stationByCode(c) : undefined;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const s = find((await params).code);
  if (!s) return {};
  const title = `${s.name}（${s.pref ?? ""}）のタイドグラフ・いまの潮・実測潮位`;
  const description = `${s.name}の潮見表。いまは上げ何分・下げ何分か、次の満潮・干潮までの時間、気象庁の実測潮位と推算潮位の比較、過去1年の潮位を見られます。`;
  return { title, description, alternates: { canonical: `/tide/${stationSlug(s.code)}/` }, openGraph: { title, description } };
}

export default async function TideStationPage({ params }: { params: Promise<Params> }) {
  const s = find((await params).code);
  if (!s) notFound();
  // この地点を使っている釣り場と、近くのほかの地点
  const spots = publishedSpots().filter((p) => p.tideStation.code === s.code);
  const nearby = TIDE_STATIONS.filter((t) => t.code !== s.code)
    .map((t) => ({ t, km: nearestStation(s.lat!, s.lon!, [t])!.km }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 6);
  const nearSpots = spots.length
    ? []
    : publishedSpots()
        .map((p) => ({ p, km: nearestStation(spotLatLon(p).lat, spotLatLon(p).lon, [s])!.km }))
        .filter((x) => x.km < 15)
        .sort((a, b) => a.km - b.km)
        .slice(0, 4);
  return (
    <article>
      <p className="small">
        <Link href="/tide/">タイドグラフ</Link> ＞ {s.pref} ＞ {s.name}
      </p>
      <h1>{s.name}の潮</h1>
      <TideViewer st={{ code: s.code, name: s.name, lat: s.lat!, lon: s.lon!, obsOffset: obsOffset(s) }} />
      {(spots.length > 0 || nearSpots.length > 0) && (
        <>
          <h2>この潮を使っている釣り場</h2>
          <ul>
            {[...spots.map((p) => ({ p, km: null as number | null })), ...nearSpots].map(({ p, km }) => (
              <li key={p.slug}>
                <Link href={spotHref(p)}>{p.name}</Link> <span className="small">{p.area}{km != null ? `（約${Math.round(km)}km）` : ""}</span>
                <Link href={`/shio/${p.slug}/`} className="small">
                  風・波・釣りどき →
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2>近くの地点</h2>
      <ul className="tv-pick" style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {nearby.map(({ t, km }) => (
          <li key={t.code}>
            <Link href={`/tide/${stationSlug(t.code)}/`} className="small">
              {t.name}（{Math.round(km)}km）
            </Link>
          </li>
        ))}
      </ul>
      <p className="small">
        地点：気象庁「潮位表」の{s.name}（地点記号 {s.code}、北緯{s.lat}度・東経{s.lon}度）。潮位は潮位表基準面からの高さ（cm）です。釣り場とは時刻・高さが少しずれることがあります。
        出典：気象庁「
        <a href={`https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=${s.code}`} rel="noopener">
          潮位表
        </a>
        」「<a href="https://www.jma.go.jp/bosai/tidelevel/" rel="noopener">潮位観測情報</a>」「
        <a href="https://www.data.jma.go.jp/kaiyou/db/tide/genbo/index.php" rel="noopener">
          潮汐観測資料
        </a>
        」をもとに当サイトが加工して表示しています（実測は速報値を含みます）。
      </p>
    </article>
  );
}
