"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SpotJiai } from "@/lib/jiaiBuild";
import { readFavorites } from "@/app/components/FavoriteButton";

function dayLabel(date: string, i: number) {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${i === 0 ? "今日" : i === 1 ? "明日" : "あさって"} ${m}/${d}(${w})`;
}

const best = (s: SpotJiai, date: string) => Math.max(0, ...(s.days[date]?.windows ?? []).map((w) => w.score));

// 今日・明日・あさってのねらい目ランキング（当サイト独自の目安）
export default function JiaiRanking({ dates, spots }: { dates: string[]; spots: SpotJiai[] }) {
  const [tab, setTab] = useState(0);
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    setFavs(readFavorites());
    // 夕方以降は「明日」を最初に開く
    const now = new Date(Date.now() + 9 * 3600e3);
    const today = now.toISOString().slice(0, 10);
    const i = dates.indexOf(today);
    if (i > 0) setTab(i);
    else if (i === 0 && now.getUTCHours() >= 18) setTab(1);
  }, [dates]);

  const date = dates[tab];
  const ranked = [...spots].sort((a, b) => best(b, date) - best(a, date) || b.recentReports - a.recentReports);
  const withWin = ranked.filter((s) => best(s, date) > 0);
  const withoutWin = ranked.filter((s) => best(s, date) === 0);
  const favSpots = spots.filter((s) => favs.includes(s.slug));
  const windy = spots.filter((s) => (s.days[date]?.maxWind ?? 0) >= 10).length;

  const row = (s: SpotJiai, rank?: number) => {
    const d = s.days[date];
    return (
      <li key={s.slug} className="rank-row">
        {rank !== undefined && <span className="rank-no">{rank}</span>}
        <div className="rank-body">
          <Link href={s.href} className="rank-name">{s.name}</Link>
          <span className="small"> {s.area}</span>
          <div className="rank-win">
            {d && d.windows.length > 0
              ? d.windows.map((w) => (
                  <span key={w.from} className="jiai-chip">
                    <b>{w.grade}</b> {w.from}時〜{w.to}時
                    {w.reasons.length > 0 && <span className="small">（{w.reasons.join("・")}）</span>}
                  </span>
                ))
              : <span className="small">{d?.note ?? "潮汐データ準備中"}</span>}
          </div>
          {s.recent.length > 0 && <div className="small">最近：{s.recent.join("、")}</div>}
          {d?.maxWind != null && d.maxWind >= 10 && <div className="rank-warn">営業時間中に風速{d.maxWind}m前後の予報</div>}
        </div>
      </li>
    );
  };

  return (
    <section className="ranking">
      <div className="tide-tabs" role="tablist" aria-label="日付">
        {dates.map((d, i) => (
          <button key={d} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => setTab(i)}>
            {dayLabel(d, i)}
          </button>
        ))}
      </div>
      {favSpots.length > 0 && (
        <>
          <h3>★ お気に入りの釣り場</h3>
          <ul className="rank-list">{favSpots.map((s) => row(s))}</ul>
        </>
      )}
      <h3>ねらい目ランキング</h3>
      {windy > 0 && <p className="rank-warn">{windy}か所で、営業時間中に風速10m以上の予報があります。</p>}
      {withWin.length > 0 ? (
        <ol className="rank-list">{withWin.slice(0, 6).map((s, i) => row(s, i + 1))}</ol>
      ) : (
        <p className="small">この日は、営業時間内に目立つねらい目のある釣り場がありません。</p>
      )}
      {withoutWin.length > 0 && (
        <details className="rank-more">
          <summary>ねらい目が見つからなかった釣り場（{withoutWin.length}か所）</summary>
          <ul className="rank-list">{withoutWin.map((s) => row(s))}</ul>
        </details>
      )}
      <p className="small">
        潮の動き・朝夕のまずめ・営業時間・風の予報（気象庁）から計算した当サイト独自の目安で、釣果を保証するものではありません。
        各釣り場のページで★を押すと、ここにお気に入りとして表示されます。
      </p>
    </section>
  );
}
