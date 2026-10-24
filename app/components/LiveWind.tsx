"use client";

import { useEffect, useState } from "react";
import type { WindStation } from "@/lib/liveWind";

// いまの風（アメダスの実測）。気象庁のデータをブラウザから直接読む（10分ごとに更新される）
const DIR16 = ["静穏", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西", "北"];
type Obs = { time: string; wind: number | null; dir: number | null };

const BASE = "https://www.jma.go.jp/bosai/amedas/data";

async function block(code: string, t: Date): Promise<Record<string, { wind?: [number, number]; windDirection?: [number, number]; gust?: [number, number] }>> {
  const j = new Date(t.getTime() + 9 * 3600e3);
  const ymd = j.toISOString().slice(0, 10).replace(/-/g, "");
  const hh = String(Math.floor(j.getUTCHours() / 3) * 3).padStart(2, "0");
  const res = await fetch(`${BASE}/point/${code}/${ymd}_${hh}.json`);
  return res.ok ? res.json() : {};
}

function color(v: number | null) {
  if (v == null) return "inherit";
  if (v >= 10) return "#c62828";
  if (v >= 7) return "#e08a00";
  return "inherit";
}

export default function LiveWind({ station }: { station: WindStation }) {
  const [obs, setObs] = useState<Obs[] | null>(null);
  const [gust, setGust] = useState<number | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const latest = new Date((await (await fetch(`${BASE}/latest_time.txt`)).text()).trim());
        const a = await block(station.code, new Date(latest.getTime() - 3 * 3600e3));
        const b = await block(station.code, latest);
        const all = { ...a, ...b };
        const rows = Object.keys(all)
          .sort()
          .map((k) => ({ time: k, wind: all[k].wind?.[0] ?? null, dir: all[k].windDirection?.[0] ?? null }))
          .filter((r) => r.wind !== null);
        const last = Object.keys(b).sort().pop();
        if (!alive) return;
        setObs(rows.slice(-18));
        setGust(last ? b[last].gust?.[0] ?? null : null);
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [station.code]);

  if (err) return null;
  const now = obs?.[obs.length - 1];
  const hm = (k: string) => `${k.slice(8, 10)}:${k.slice(10, 12)}`;
  const trend = obs?.filter((r) => r.time.slice(10, 12) === "00").slice(-4) ?? [];
  return (
    <div className="live-wind">
      <p>
        <strong>いまの風（実測）</strong>{" "}
        {now ? (
          <>
            <b style={{ color: color(now.wind) }}>
              {now.dir != null ? DIR16[now.dir] : ""} {now.wind}m/s
            </b>
            <span className="small">（{hm(now.time)}・10分間の平均{gust != null ? `、今日の最大瞬間 ${gust}m/s` : ""}）</span>
          </>
        ) : (
          <span className="small">読み込み中…</span>
        )}
      </p>
      {trend.length > 1 && (
        <p className="small">
          この3時間：{trend.map((r) => `${hm(r.time)} ${r.dir != null ? DIR16[r.dir] : ""}${r.wind}m`).join("　")}
        </p>
      )}
      <p className="small">
        観測地点：気象庁アメダス「{station.name}」（釣り場から約{station.distKm}km）。海に面した地点の値です。釣り場の向きや地形で、体感は変わります。出典：気象庁ホームページ
      </p>
    </div>
  );
}
