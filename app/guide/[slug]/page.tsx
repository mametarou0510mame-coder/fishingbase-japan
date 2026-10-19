import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TackleTabs from "@/app/components/TackleTabs";
import { rakutenSearchUrl } from "@/lib/affiliate";
import { findGuide, guides, guideVideo, guideYoutubeId, recentSpotsForGuide, spotsForGuide } from "@/lib/guides";
import SocialFollow from "@/app/components/SocialFollow";
import { SITE } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return guides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = findGuide((await params).slug);
  if (!g) return {};
  const desc = `${g.summary.slice(0, 90)} 初級・中級・上級のタックルリスト、その日のパターンの見つけ方、関西の向いている釣り場も紹介。`;
  const og = { url: `/og/guide-${g.slug}.png`, width: 1200, height: 630, alt: g.title };
  return {
    title: `${g.title}（${g.sub}）｜釣り方ガイド`,
    description: desc,
    alternates: { canonical: `/guide/${g.slug}/` },
    openGraph: { title: `${g.title}（${g.sub}）`, description: desc, url: `/guide/${g.slug}/`, images: [og] },
    twitter: { card: "summary_large_image", images: [og.url] },
  };
}

const TAG_LABEL: Record<string, string> = { chum: "撒き餌", lure: "ルアー", cast: "投げ釣り" };

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = findGuide((await params).slug);
  if (!g) notFound();
  const video = guideVideo(g.slug);
  const yt = guideYoutubeId(g.slug);
  const spots = spotsForGuide(g);
  const recent = recentSpotsForGuide(g);
  const others = guides()
    .filter((x) => x.slug !== g.slug && x.category === g.category)
    .slice(0, 8);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.title,
    description: g.summary,
    step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })),
    ...(video ? { video: { "@type": "VideoObject", name: g.title, description: g.summary, contentUrl: `${SITE.url}${video.src}`, ...(yt ? { embedUrl: `https://www.youtube.com/embed/${yt}` } : {}), thumbnailUrl: video.poster ? `${SITE.url}${video.poster}` : undefined, uploadDate: "2026-10-19" } } : {}),
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="small">
        <Link href="/guide/">釣り方ガイド</Link> › No.{g.no}
      </p>
      <h1>
        {g.title}
        <span className="small">（{g.sub}）</span>
      </h1>
      <p className="lead">{g.summary}</p>
      <dl className="guide-meta">
        <dt>釣れる魚</dt>
        <dd>{g.targets.join("、")}</dd>
        <dt>時期</dt>
        <dd>{g.season}</dd>
        <dt>むずかしさ</dt>
        <dd>{g.level}</dd>
      </dl>

      {video ? (
        <>
          {yt ? (
            <iframe
              className="guide-video"
              src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
              title={`${g.title}（動画）`}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video className="guide-video" controls playsInline preload="metadata" poster={video.poster ?? undefined} src={video.src} />
          )}
          <p className="small" style={{ textAlign: "center" }}>
            図解アニメ（約1分）。音声合成：VOICEVOX:ずんだもん
          </p>
        </>
      ) : (
        <p className="small">解説動画は準備中です。</p>
      )}

      <h2>釣り方の手順</h2>
      <ol className="guide-steps">
        {g.steps.map((s) => (
          <li key={s.title}>
            <strong>{s.title}</strong>
            <br />
            {s.body}
          </li>
        ))}
      </ol>

      <h2>{g.patterns.title}</h2>
      <table className="catch-table pattern-table">
        <thead>
          <tr>
            <th>こんな時</th>
            <th>こうする</th>
          </tr>
        </thead>
        <tbody>
          {g.patterns.rows.map((r) => (
            <tr key={r.when}>
              <td>{r.when}</td>
              <td>
                {r.do}
                <br />
                <span className="small">{r.why}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {g.patterns.note && (
        <p className="small">
          {g.patterns.note} <Link href="/">今日のねらい目を見る</Link>
        </p>
      )}

      {g.hookTable && (
        <>
          <h2>{g.hookTable.title}</h2>
          <table className="catch-table">
            <thead>
              <tr>
                <th>針の大きさ</th>
                <th>狙える魚</th>
              </tr>
            </thead>
            <tbody>
              {g.hookTable.rows.map((r) => (
                <tr key={r.size}>
                  <td>{r.size}</td>
                  <td>{r.fish}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {g.hookTable.note && <p className="small">{g.hookTable.note}</p>}
        </>
      )}

      <h2>タックルリスト（初級・中級・上級）</h2>
      <p className="aff-label">
        <span className="pr">PR</span> 楽天市場の広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）。
        リンク先は条件に合う商品の検索結果です。金額は目安です。
      </p>
      <TackleTabs
        tiers={g.tackle.map((t) => ({ ...t, items: t.items.map((it) => ({ name: it.name, spec: it.spec, href: rakutenSearchUrl(it.keyword) })) }))}
      />

      <h2>どんな場所で釣るか</h2>
      <p>{g.places.text}</p>
      <ul>
        {g.places.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {recent.length > 0 && (
        <>
          <h3>最近、{g.targets.slice(0, 2).join("・")}などが釣れている釣り場</h3>
          <ul>
            {recent.slice(0, 6).map((r) => (
              <li key={r.spot.slug}>
                <Link href={`/kansai/${r.spot.pref}/${r.spot.slug}/`}>{r.spot.name}</Link>
                <span className="small">
                  （直近2週間の釣果報告 {r.reports}件・最新 {r.latest.slice(5).replace("-", "/")}）
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {g.category !== "基本" && (
        <>
          <h3>この釣り方ができる関西の釣り場</h3>
          <p className="small">
            {g.gearTags.length > 0
              ? `${g.gearTags.map((t) => TAG_LABEL[t]).join("・")}の禁止が確認されていない釣り場です。`
              : "当サイトで紹介している釣り場です。"}
            現地の掲示やルールを必ず確認してください。
          </p>
          <ul className="spot-mini">
            {spots.map((s) => (
              <li key={s.slug}>
                <Link href={`/kansai/${s.pref}/${s.slug}/`}>{s.name}</Link> <span className="small">{s.type}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>動画で毎日配信中</h2>
      <SocialFollow />

      <h2>安全とルール</h2>
      <ul>
        {g.safety.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="small">
        トゲや毒のある魚は<Link href="/safety/fish/">危険な魚ガイド</Link>をご覧ください。
      </p>

      {others.length > 0 && (
        <>
          <h2>ほかの釣り方ガイド（{g.category}）</h2>
          <ul>
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/guide/${o.slug}/`}>{o.title}</Link> <span className="small">{o.sub}</span>
              </li>
            ))}
          </ul>
          <p>
            <Link href="/guide/">釣り方ガイドの一覧（全{guides().length}本）</Link>
          </p>
        </>
      )}
    </article>
  );
}
