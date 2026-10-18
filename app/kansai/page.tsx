import type { Metadata } from "next";
import Link from "next/link";
import { PREF_LABEL, publishedSpots } from "@/lib/spots";

export const metadata: Metadata = {
  title: "関西の釣り場一覧",
  description: "関西の海釣り施設の料金・営業時間・ルールと、今日の潮汐をまとめています。",
};

export default function KansaiIndex() {
  const spots = publishedSpots();
  const ORDER = ["osaka", "hyogo", "kyoto", "wakayama"] as const;
  const prefs = ORDER.filter((p) => spots.some((s) => s.pref === p));
  return (
    <>
      <h1>関西の釣り場</h1>
      <p className="lead">
        料金・営業時間・ルールは公式情報で確認した日付とあわせて掲載しています。「概要のみ」の釣り場は、リンク先の施設サイトで詳細をご確認ください。
      </p>
      {prefs.map((p) => (
        <section key={p}>
          <h2>{PREF_LABEL[p]}</h2>
          <div className="cards">
            {spots
              .filter((s) => s.pref === p)
              .map((s) => (
                <Link key={s.slug} href={`/kansai/${s.pref}/${s.slug}/`} className="card card-link">
                  <h3>{s.name}</h3>
                  <p>
                    {s.area}・{s.type}
                    {s.level === "basic" && "（概要のみ）"}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
      <p className="small">掲載する釣り場は順次追加します。</p>
    </>
  );
}
