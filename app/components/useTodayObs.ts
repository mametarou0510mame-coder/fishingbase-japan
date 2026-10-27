"use client";

// 今日の実測潮位（気象庁「潮位観測情報」、5分ごと）を、推算潮位＋潮位偏差として潮位表と同じ基準にそろえて返す。
// 観測のない地点・読めなかったときは null。5分ごとに読み直す。
import { useEffect, useState } from "react";
import { jstToday, predictedAt, type TideDay } from "@/lib/tideCalc";
import { loadPoints, loadRealtime } from "@/lib/tideObs";

export type TodayObs = { pts: { h: number; cm: number }[]; lastDev: number; name: string } | null;

export function useTodayObs(code: string | undefined, days: { date: string; hourly: (number | null)[]; high: TideDay["high"]; low: TideDay["low"] }[] | null): TodayObs {
  const [obs, setObs] = useState<TodayObs>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 5 * 60e3);
    return () => clearInterval(t);
  }, []);
  const ready = !!days?.length;
  useEffect(() => {
    if (!code || !ready) return;
    let alive = true;
    (async () => {
      const pt = (await loadPoints())?.find((p) => p.code === code);
      if (!pt) return;
      const today = jstToday();
      const r = await loadRealtime(pt.point, today);
      if (!r || !alive) return;
      const map = new Map(days!.map((d) => [d.date, { date: d.date, hourly: d.hourly.slice(0, 24), high: d.high, low: d.low }]));
      const pts: { h: number; cm: number }[] = [];
      r.h.forEach((h, i) => {
        const p = predictedAt(map, today, h);
        if (p != null) pts.push({ h, cm: p + r.dev[i] });
      });
      if (pts.length) setObs({ pts, lastDev: r.dev[r.dev.length - 1], name: pt.name });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, ready, tick]);
  return obs;
}
