import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatchSummary from "@/app/components/CatchSummary";
import TideWidget from "@/app/components/TideWidget";
import LiveWind from "@/app/components/LiveWind";
import { nearestWindStation } from "@/lib/liveWind";
import { spotLatLon } from "@/lib/shioData";
import WeatherPanel from "@/app/components/WeatherPanel";
import FishingIndex from "@/app/components/FishingIndex";
import SpotGear from "@/app/components/SpotGear";
import FavoriteButton from "@/app/components/FavoriteButton";
import Checklist from "@/app/components/Checklist";
import CatchPatterns from "@/app/components/CatchPatterns";
import UserPosts from "@/app/components/UserPosts";
import { indexFor } from "@/lib/fishingIndex";
import { forecastFor } from "@/lib/weather";
import { STATION_COORDS } from "@/lib/sun";
import { stationByCode } from "@/lib/tideStations";
import { SITE } from "@/lib/site";
import { areaOfSpot } from "@/lib/areas";
import { DEFAULT_DAYS, monthlyOf, recentReports, sourceOf, sourcesOf, summarize } from "@/lib/catches";
import { PREF_LABEL, isKansai, publishedSpots, spotHref } from "@/lib/spots";
import { guidesForSpot } from "@/lib/guides";

type Params = { pref: string; slug: string };

export const dynamicParams = false;

// 関西の釣り場は /kansai/、ほかの地域は /spots/（app/spots/[pref]/[slug]/page.tsx が同じページを使う）
export function generateStaticParams(): Params[] {
  return publishedSpots()
    .filter((s) => isKansai(s.pref))
    .map((s) => ({ pref: s.pref, slug: s.slug }));
}

function findSpot(p: Params) {
  return publishedSpots().find((s) => s.pref === p.pref && s.slug === p.slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const spot = findSpot(await params);
  if (!spot) return {};
  const recentSp = summarize([spot.slug]).list.slice(0, 3).map((x) => x.species.replace(/（.*?）/g, ""));
  const path = spotHref(spot);
  const desc = `${spot.name}（${spot.area}）の今日の釣れる時間（ねらい目）、タイドグラフ、時間ごとの天気・風、${recentSp.length ? `最近の釣果（${recentSp.join("・")}など）` : "最近の釣果"}、料金・ルールをまとめています。`;
  const og = { url: `/og/spot-${spot.slug}.png`, width: 1200, height: 630, alt: `${spot.name}の釣果・タイドグラフ・天気` };
  return {
    title: `${spot.name}の釣果・タイドグラフ・天気`,
    description: desc,
    alternates: { canonical: path },
    openGraph: { title: `${spot.name}の釣果・タイドグラフ・天気`, description: desc, url: path, images: [og] },
    twitter: { card: "summary_large_image", images: [og.url] },
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
  const forecast = forecastFor(spot);
  const fishIndex = indexFor(spot.slug);

  const pageUrl = `${SITE.url}${spotHref(spot)}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: spot.name,
      description: spot.intro,
      url: pageUrl,
      image: `${SITE.url}/og/spot-${spot.slug}.png`,
      address: { "@type": "PostalAddress", addressCountry: "JP", streetAddress: spot.address },
      ...(spot.officialUrl ? { sameAs: [spot.officialUrl] } : {}),
      touristType: "釣り",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        isKansai(spot.pref)
          ? { "@type": "ListItem", position: 1, name: "関西", item: `${SITE.url}/kansai/` }
          : { "@type": "ListItem", position: 1, name: PREF_LABEL[spot.pref], item: `${SITE.url}/map/` },
        ...(area ? [{ "@type": "ListItem", position: 2, name: area.name, item: `${SITE.url}/kansai/area/${area.slug}/` }] : []),
        { "@type": "ListItem", position: area ? 3 : 2, name: spot.name, item: pageUrl },
      ],
    },
  ];
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="small">
        {isKansai(spot.pref) ? <Link href="/kansai/">関西</Link> : <Link href="/map/">釣り場</Link>} ＞{" "}
        {area ? <Link href={`/kansai/area/${area.slug}/`}>{area.name}</Link> : PREF_LABEL[spot.pref]} ＞ {spot.name}
      </p>
      <h1>{spot.name}</h1>
      <FavoriteButton slug={spot.slug} />
      <p className="lead">{spot.intro}</p>

      <h2>タイドグラフ・天気・風・波</h2>
      <p className="small">
        <Link href={`/shio/${spot.slug}/`}>7日先までの潮・風・波と「釣りどき指数」「安全の目安」を見る →</Link>
      </p>
      {(() => {
        const c = spotLatLon(spot);
        const st = nearestWindStation(c.lat, c.lon, spot.slug);
        return st ? <LiveWind station={st} /> : null;
      })()}
      <TideWidget
        code={spot.tideStation.code}
        stationName={spot.tideStation.name}
        coords={
          STATION_COORDS[spot.tideStation.code] ??
          (() => {
            const t = stationByCode(spot.tideStation.code);
            return t ? { lat: t.lat!, lon: t.lon! } : undefined;
          })()
        }
        weather={forecast.data}
        spotName={spot.name}
        pageUrl={`${SITE.url}${spotHref(spot)}`}
        openByMonth={spot.openHourByMonth}
        closeByMonth={spot.closeHourByMonth}
      />

      <h3>3日間の天気（{forecast.label}）</h3>
      <WeatherPanel label={forecast.label} data={forecast.data} />

      {fishIndex.data && (
        <>
          <h2>釣れ指数（今後7日）</h2>
          <FishingIndex data={fishIndex.data} />
        </>
      )}

      <h2>基本情報</h2>
      <table>
        <tbody>
          <tr><th>所在地</th><td>{spot.address}</td></tr>
          {spot.hours && <tr><th>営業時間</th><td>{spot.hours}</td></tr>}
          {spot.closed && <tr><th>休業日</th><td>{spot.closed}</td></tr>}
          {spot.type === "沖堤防（渡船）" && (
            <tr><th>渡船料金</th><td>渡船店の<a href={spot.officialUrl} rel="noopener">公式サイト</a>でご確認ください</td></tr>
          )}
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
          お出かけ前に
          <a href={spot.officialUrl} rel="noopener">{spot.type === "一般の釣り場" || spot.officialUrl.includes("mlit.go.jp") ? "参照ページ" : "施設のサイト"}</a>
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
          <h2>{spot.rulesSource === "report" ? "報告されている規制・注意点" : "ルール・禁止事項"}</h2>
          {spot.rulesSource === "report" && (
            <p className="small">
              管理者の公式発表ではなく、公開されている釣り場情報の調査（参照リンク先）をもとにしています。
              規制は変わることがあるため、現地の看板・柵・立入禁止の表示を必ず優先してください。
            </p>
          )}
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
            直近{DEFAULT_DAYS}日間に施設・渡船・釣具店が公開した釣果の集計です（出典：
            {sourcesOf(spot.slug).map((src, i) => (
              <span key={src.url}>
                {i > 0 && "、"}
                <a href={src.url} rel="noopener">{src.name}</a>
              </span>
            ))}
            ）。
          </p>
          <CatchSummary list={summary.list} />
          <CatchPatterns spotSlug={spot.slug} />
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

      {SITE.turnstileSiteKey && (
        <>
          <h2>みんなの釣果</h2>
          <UserPosts spot={spot.slug} enabled />
        </>
      )}

      <h2>持ち物チェックリスト</h2>
      <p className="small">
        ゴンズイやハオコゼなど毒のある魚も釣れます。見分け方は<Link href="/safety/fish/">危険な魚ガイド</Link>へ。
      </p>
      <Checklist
        slug={spot.slug}
        noChum={!!spot.restrictions?.includes("no-chum")}
        sakura={!!spot.restrictions?.includes("sakura-lifejacket")}
        lifeRequired={!!spot.restrictions?.includes("lifejacket-required")}
        ferry={spot.type === "沖堤防（渡船）"}
        hasFee={spot.fees.some((f) => /円/.test(f.value)) || spot.type === "沖堤防（渡船）"}
        closeByMonth={spot.closeHourByMonth}
        cautions={spot.rules.filter((r) => /竿は1人|クーラー|キャリー|受付/.test(r))}
      />

      {spot.type === "海上釣り堀" && (
        <>
          <h2>海上釣り堀の楽しみ方</h2>
          <p>
            放流された魚を、筏や生簀のまわりで釣ります。竿のレンタルがあるので手ぶらでも大丈夫です。エサ・仕掛けは施設で買えるほか、持ち込みもできます（使える仕掛けは施設のルールに従ってください）。
            撒き餌・サビキ・ルアーなど、ふつうの堤防とは禁止のルールが違うことが多いので、上の「ルール」を必ず確認しましょう。
          </p>
        </>
      )}

      {spot.type !== "一般の釣り場" && spot.type !== "海上釣り堀" && <SpotGear spot={spot} />}

      {spot.type !== "海上釣り堀" && (() => {
        const gl = guidesForSpot(spot, summary.list.map((x) => x.species));
        return gl.length > 0 ? (
          <>
            <h2>ここで楽しめる釣り方（動画つき）</h2>
            <ul>
              {gl.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guide/${g.slug}/`}>{g.title}</Link> <span className="small">{g.sub}</span>
                </li>
              ))}
            </ul>
            <p className="small">ルールで禁止が確認されている釣り方は除いています。現地の掲示も必ずご確認ください。</p>
          </>
        ) : null;
      })()}

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
