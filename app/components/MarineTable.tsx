"use client";

// 潮位ポイントの風・波・雨の予報（3時間ごと・5日先まで）。ECMWF Open Data から毎日2回作る public/data/marine-tide/<地点>.json を読む。
import { useEffect, useState } from "react";

type Data = { run: string; stepHours: number; ws: (number | null)[]; wd: (number | null)[]; swh: (number | null)[]; rain: (number | null)[] };

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const DIR = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
const windColor = (v: number | null) => (v == null ? "#9aa8b5" : v >= 10 ? "#c62828" : v >= 7 ? "#e08a00" : v >= 4 ? "#1f6fb2" : "#2e9e5b");
const waveColor = (v: number | null) => (v == null ? "#9aa8b5" : v >= 2 ? "#c62828" : v >= 1.2 ? "#e08a00" : "#10345a");

export default function MarineTable({ code }: { code: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setD(null);
    setErr(false);
    fetch(`/data/marine-tide/${code}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => alive && setD(j))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [code]);
  if (err) return <p className="small">風・波の予報は準備中です。</p>;
  if (!d) return <p className="small">風・波の予報を読み込み中…</p>;
  const t0 = new Date(d.run).getTime();
  const now = Date.now();
  // 日本時間で日ごとにまとめる（3時〜21時、過ぎた時間は出さない）
  const days = new Map<string, { h: number; i: number }[]>();
  d.ws.forEach((_, i) => {
    const t = t0 + i * d.stepHours * 3600e3;
    if (t < now - 3 * 3600e3) return;
    const j = new Date(t + 9 * 3600e3);
    const key = j.toISOString().slice(0, 10);
    const h = j.getUTCHours();
    if (h < 3) return;
    if (!days.has(key)) days.set(key, []);
    days.get(key)!.push({ h, i });
  });
  const list = [...days.entries()].slice(0, 5);
  return (
    <div className="mt">
      {list.map(([day, cols]) => {
        const [y, m, dd] = day.split("-").map(Number);
        return (
          <div key={day} className="mt-day">
            <b>
              {m}/{dd}（{WEEK[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]}）
            </b>
            <div className="mt-grid" style={{ gridTemplateColumns: `3.2em repeat(${cols.length}, 1fr)` }}>
              <span className="mt-k">時</span>
              {cols.map((c) => (
                <span key={c.h} className="mt-h">{c.h}</span>
              ))}
              <span className="mt-k">風</span>
              {cols.map((c) => {
                const v = d.ws[c.i];
                const w = d.wd[c.i];
                return (
                  <span key={c.h} style={{ color: windColor(v) }} title={w != null ? `${DIR[Math.round(w / 22.5) % 16]}の風` : ""}>
                    {w != null && <i style={{ display: "inline-block", transform: `rotate(${w + 180}deg)` }}>↑</i>}
                    {v != null ? Math.round(v) : "－"}
                  </span>
                );
              })}
              <span className="mt-k">波</span>
              {cols.map((c) => {
                const v = d.swh[c.i];
                return (
                  <span key={c.h} style={{ color: waveColor(v ?? null) }}>
                    {v != null ? v.toFixed(1) : "－"}
                  </span>
                );
              })}
              <span className="mt-k">雨</span>
              {cols.map((c) => {
                const v = d.rain[c.i];
                return <span key={c.h}>{v == null ? "－" : v >= 1 ? `☔${Math.round(v)}` : v >= 0.3 ? "☂" : "・"}</span>;
              })}
            </div>
          </div>
        );
      })}
      <p className="small">風：m/s（矢印は風の吹いていく向き）、波：有義波高 m、雨：3時間の雨量 mm。ECMWF Open Data（CC BY 4.0）をもとに当サイトが加工。沿岸から離れた沖の値に近く、湾の奥や岸の近くでは実際と違うことがあります。</p>
    </div>
  );
}
