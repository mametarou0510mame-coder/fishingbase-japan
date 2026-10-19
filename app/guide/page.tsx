import type { Metadata } from "next";
import Link from "next/link";
import { guidePlan, guides, guideVideo } from "@/lib/guides";

export const metadata: Metadata = {
  title: "釣り方ガイド（動画つき・初心者向け）",
  description:
    "サビキ釣り、ショアジギング、サワラのブレードジグなど、関西の堤防・海釣り施設で使える釣り方を1分の図解動画で解説。初級・中級・上級のタックルリストとその日のパターンの見つけ方つき。",
};

export default function GuideIndex() {
  const list = guides();
  const done = new Set(list.map((g) => g.slug));
  const planned = guidePlan().filter((p) => !done.has(p.slug));
  const cats = [...new Set(list.map((g) => g.category))];
  return (
    <article>
      <h1>釣り方ガイド</h1>
      <p className="lead">
        はじめての人でも今日から始められるように、釣り方を1分の図解動画と、道具のリスト（初級・中級・上級）、その日のパターンの見つけ方でまとめています。
      </p>
      {cats.map((c) => (
        <section key={c}>
          <h2>{c}</h2>
          <div className="cards">
            {list
              .filter((g) => g.category === c)
              .map((g) => (
                <Link key={g.slug} href={`/guide/${g.slug}/`} className="card card-link guide-card">
                  <span className="num">
                    No.{g.no}・{g.level}
                    {guideVideo(g.slug) ? "・動画あり" : ""}
                  </span>
                  <h3>{g.title}</h3>
                  <p>{g.sub}。{g.targets.slice(0, 3).join("、")}など</p>
                </Link>
              ))}
          </div>
        </section>
      ))}
      {planned.length > 0 && (
        <>
          <h2>これから追加するガイド</h2>
          <ol className="plan-list">
            {planned.map((p) => (
              <li key={p.slug} value={p.no}>
                {p.title}
              </li>
            ))}
          </ol>
        </>
      )}
    </article>
  );
}
