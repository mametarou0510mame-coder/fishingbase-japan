"use client";

import { useEffect, useMemo, useState } from "react";

type TideEvent = { time: string; cm: number };
type TideDay = { date: string; hourly: (number | null)[]; high: TideEvent[]; low: TideEvent[] };
type TideFile = { station: string; year: number; sourceUrl: string; days: TideDay[] };

function jstDate(offsetDays = 0): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
function label(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}(${WEEK[w]})`;
}

async function loadYear(code: string, year: number): Promise<TideDay[]> {
  try {
    const res = await fetch(`/data/tides/${code}-${year}.json`);
    if (!res.ok) return [];
    const json = (await res.json()) as TideFile;
    return json.days;
  } catch {
    return [];
  }
}

function TideChart({ day }: { day: TideDay }) {
  const values = day.hourly.filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const min = Math.min(...values) - 10;
  const max = Math.max(...values) + 10;
  const W = 320;
  const H = 120;
  const x = (h: number) => 24 + (h / 23) * (W - 34);
  const y = (cm: number) => 10 + (1 - (cm - min) / (max - min)) * (H - 30);
  const points = day.hourly
    .map((v, h) => (v === null ? null : `${x(h).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tide-chart" role="img" aria-label="1日の潮位の変化（1時間ごと）">
      {[0, 6, 12, 18, 23].map((h) => (
        <g key={h}>
          <line x1={x(h)} x2={x(h)} y1={10} y2={H - 20} className="grid" />
          <text x={x(h)} y={H - 6} textAnchor="middle" className="axis">{h}時</text>
        </g>
      ))}
      <polyline points={points} className="line" fill="none" />
    </svg>
  );
}

export default function TideWidget({ code, stationName }: { code: string; stationName: string }) {
  const [days, setDays] = useState<TideDay[] | null>(null);
  const [offset, setOffset] = useState(0);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => jstDate(i)), []);

  useEffect(() => {
    const years = Array.from(new Set(dates.map((d) => Number(d.slice(0, 4)))));
    Promise.all(years.map((y) => loadYear(code, y))).then((r) => setDays(r.flat()));
  }, [code, dates]);

  const day = days?.find((d) => d.date === dates[offset]);

  return (
    <section className="tide">
      <div className="tide-tabs" role="tablist" aria-label="日付">
        {dates.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={i === offset}
            className={i === offset ? "on" : ""}
            onClick={() => setOffset(i)}
          >
            {i === 0 ? "今日" : label(d)}
          </button>
        ))}
      </div>

      {days === null && <p className="small">潮汐データを読み込み中…</p>}
      {days !== null && !day && <p className="small">この日の潮汐データは準備中です。</p>}
      {day && (
        <>
          <table className="tide-table">
            <tbody>
              <tr>
                <th>満潮</th>
                <td>{day.high.length ? day.high.map((e) => `${e.time}（${e.cm}cm）`).join("　") : "なし"}</td>
              </tr>
              <tr>
                <th>干潮</th>
                <td>{day.low.length ? day.low.map((e) => `${e.time}（${e.cm}cm）`).join("　") : "なし"}</td>
              </tr>
            </tbody>
          </table>
          <TideChart day={day} />
        </>
      )}
      <p className="small">
        潮位の観測・予測地点：{stationName}（釣り場とは時刻・潮位が多少異なります）。
        出典：
        <a href="https://www.data.jma.go.jp/kaiyou/db/tide/suisan/index.php" rel="noopener">
          気象庁ホームページ「潮位表」
        </a>
        をもとに当サイトが加工して作成。表示の編集責任は当サイトにあります。
      </p>
    </section>
  );
}
