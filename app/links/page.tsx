import type { Metadata } from "next";
import Link from "next/link";
import HOT from "@/content/hot-notes.json";
import { AFF_SHOPS, amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";
import { findGuide } from "@/lib/guides";
import { SITE } from "@/lib/site";
import fs from "node:fs";
import path from "node:path";

// Instagram・YouTube のプロフィールのリンク用ページ。投稿文のリンクは押せないため、ここにまとめる。
export const metadata: Metadata = {
  title: "ツレドキ関西のリンク集（今アツい情報・おすすめ道具）",
  description: "Instagram・YouTube から来た人向けのページです。今アツい釣り情報、今日・明日のねらい目、動画で紹介した道具（楽天市場）、マイ水族館・デジタル魚拓へのリンクをまとめています。",
  alternates: { canonical: "/links/" },
};

const JST_TODAY = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// YouTube に投稿済みの長尺動画（新しい順）。投稿のたびにサイトが作り直されるので、ここも自動で増える
function longVideos() {
  try {
    const posts = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/sns/long-posts.json"), "utf-8")) as Record<string, { youtube?: string }>;
    return Object.entries(posts)
      .filter(([, v]) => v.youtube)
      .map(([slug, v]) => {
        const src = JSON.parse(fs.readFileSync(path.join(process.cwd(), `content/long/${slug}.json`), "utf-8")) as { title: string };
        return { id: v.youtube as string, title: src.title.replace("【完全版】", "") };
      })
      .reverse();
  } catch {
    return [];
  }
}

export default function LinksPage() {
  const videos = longVideos();
  const hotOn = HOT.until >= JST_TODAY();
  const hotGuide = findGuide(HOT.guide.replace(/^\/guide\/|\/$/g, ""));
  const gear = hotGuide?.tackle[0];
  return (
    <div className="links-page">
      <h1>ツレドキ関西</h1>
      <p className="lead">関西の釣り場の、今日の釣れる時間・最近の釣果・釣り方をまとめた無料サイトです。</p>

      <section className="yt-block">
        <h2>▶ YouTube：釣り方の完全ガイド（約10分）</h2>
        <p className="small">Instagram のリールの続きはこちら。道具・仕掛け・釣り方・釣れる時期をまとめています。</p>
        <div className="link-list">
          {videos.slice(0, 4).map((v) => (
            <a key={v.id} className="link-btn yt" href={`https://youtu.be/${v.id}`} rel="noopener" target="_blank">{v.title}</a>
          ))}
          <a className="link-btn" href={SITE.youtube} rel="noopener" target="_blank">チャンネルの動画をすべて見る</a>
        </div>
      </section>

      {hotOn && (
        <section className="hot-notes">
          <h2>🔥 {HOT.title}</h2>
          <p>{HOT.sub}</p>
          <p className="small">場所：{HOT.spots.map((x) => x.name).join("・")}</p>
          <Link className="link-btn" href={HOT.guide}>釣り方を見る（{hotGuide?.title ?? "ガイド"}）</Link>
        </section>
      )}

      <nav className="link-list" aria-label="よく見られているページ">
        <Link className="link-btn app" href="/app/">📱 アプリ：地図で釣り場を選んで、潮・天気・おすすめの釣り方</Link>
        <Link className="link-btn" href="/">今日・明日・週末のねらい目ランキング</Link>
        <Link className="link-btn" href="/kansai/area/">エリア別：最近釣れている魚</Link>
        <Link className="link-btn" href="/aquarium/">デジタル魚拓・マイ水族館</Link>
        <Link className="link-btn" href="/guide/">釣り方ガイド（動画30本）</Link>
        <Link className="link-btn" href="/map/">地図から釣り場を探す</Link>
        <Link className="link-btn" href="/start/">はじめての釣り 1回目プラン</Link>
        <Link className="link-btn" href="/gear/sale/">釣り道具のお得情報</Link>
      </nav>

      {gear && hotGuide && (
        <section>
          <h2>動画で紹介した道具：{hotGuide.title}</h2>
          <p className="aff-label">
            <span className="pr">PR</span> {AFF_SHOPS}の広告リンクです（<Link href="/pr-policy/">選定方針</Link>）。価格・在庫はリンク先でご確認ください。
          </p>
          <ul className="gear-links">
            {gear.items.map((it) => (
              <li key={it.name}>
                <a href={rakutenSearchUrl(it.keyword)} rel="sponsored nofollow noopener" target="_blank">
                  <b>{it.name}</b>
                  <span className="small">{it.spec}</span>
                </a>
                {amazonSearchUrl(it.keyword) && (
                  <a className="small" href={amazonSearchUrl(it.keyword) as string} rel="sponsored nofollow noopener" target="_blank">
                    Amazonで探す
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="small">ほかの釣り方の道具（初級・中級・上級）は、<Link href="/guide/">各釣り方ガイド</Link>のページにあります。</p>
        </section>
      )}

      <section>
        <h2>SNS</h2>
        <div className="link-list">
          <a className="link-btn" href={SITE.youtube} rel="noopener" target="_blank">YouTube（長尺の完全ガイド・ショート）</a>
          <a className="link-btn" href={SITE.instagram} rel="noopener" target="_blank">Instagram {SITE.instagramHandle}</a>
        </div>
      </section>
    </div>
  );
}
