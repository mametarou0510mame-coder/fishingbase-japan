"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readFavorites } from "@/app/components/FavoriteButton";

export type ListDay = { date: string; score: number | null; tone: string; mark: string; safety: 0 | 1 | 2; tideName: string; weather: string | null; swh: number | null; wind: number | null };
export type ListSpot = { slug: string; name: string; type: string; days: ListDay[] };
export type ListArea = { name: string; spots: ListSpot[] };

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const tone = (t: string) =>
  t === "best" ? "var(--glow)" : t === "good" ? "var(--tide)" : t === "fair" ? "var(--sea-2)" : t === "stop" ? "var(--float)" : "var(--muted)";
const safe = (l: number) => (l === 2 ? "var(--float)" : l === 1 ? "var(--glow)" : "var(--tide)");
const wIcon = (w: string | null) => (w === "晴れ" ? "☀" : w === "くもり" ? "☁" : w === "雨" ? "☂" : w === "雪" ? "❄" : "");
const head = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return { m, d, w: WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
};

function Row({ s, from, n }: { s: ListSpot; from: string; n: number }) {
  const i = Math.max(0, s.days.findIndex((d) => d.date === from));
  const days = s.days.slice(i, i + n);
  return (
    <tr>
      <th>
        <Link href={`/shio/${s.slug}/`}>{s.name}</Link>
        <span className="shio-k">{s.type}</span>
      </th>
      {days.map((d) => (
        <td key={d.date} title={`${d.tideName}・釣りどき指数${d.score ?? "－"}${d.swh != null ? `・波${d.swh.toFixed(1)}m` : ""}${d.wind != null ? `・風${d.wind}m/s` : ""}`}>
          <span className="shio-cell" style={{ background: tone(d.tone) }}>
            {d.score ?? "－"}
          </span>
          <span className="shio-cell-sub">
            <i style={{ background: safe(d.safety) }} />
            {wIcon(d.weather)}
          </span>
        </td>
      ))}
    </tr>
  );
}

function Table({ spots, from, n, caption }: { spots: ListSpot[]; from: string; n: number; caption: string }) {
  const dates = (spots[0]?.days ?? []).map((d) => d.date);
  const i = Math.max(0, dates.indexOf(from));
  return (
    <div className="shio-table-wrap">
      <table className="shio-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>釣り場</th>
            {dates.slice(i, i + n).map((d, k) => {
              const h = head(d);
              return (
                <th key={d}>
                  {k === 0 ? "今日" : `${h.m}/${h.d}`}
                  <small>({h.w})</small>
                  <small className="shio-k">{spots[0].days.find((x) => x.date === d)?.tideName}</small>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {spots.map((s) => (
            <Row key={s.slug} s={s} from={from} n={n} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ShioList({ areas }: { areas: ListArea[] }) {
  const [from, setFrom] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    setFrom(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
    setFavs(readFavorites());
  }, []);
  const today = from ?? new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const all = areas.flatMap((a) => a.spots);
  const mine = favs.map((f) => all.find((s) => s.slug === f)).filter((s): s is ListSpot => !!s);
  return (
    <div>
      <section className="shio-mine">
        <h2>マイポイントの週間くらべ</h2>
        {mine.length ? (
          <Table spots={mine} from={today} n={7} caption="お気に入りの釣り場を7日分くらべる（数字は釣りどき指数）" />
        ) : (
          <p className="small">
            釣り場のページで「☆ お気に入りに追加」を押すと、ここに並んで7日分の釣りどき指数と安全の目安をくらべられます（この端末のブラウザだけに保存されます）。
          </p>
        )}
      </section>
      {areas.map((a) => (
        <section key={a.name}>
          <h2>{a.name}</h2>
          <Table spots={a.spots} from={today} n={7} caption={`${a.name}の釣り場（数字は釣りどき指数、●は安全の目安）`} />
        </section>
      ))}
    </div>
  );
}
