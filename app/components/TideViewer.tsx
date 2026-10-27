"use client";

// タイドグラフ（推算潮位＋実測潮位）と「いまの潮（上げ○分）」。日付を前後に動かして過去の潮位も見られる。
// データはブラウザから気象庁のサイトを直接読む（lib/tideObs.ts）。
import { useEffect, useMemo, useRef, useState } from "react";
import { moonInfo } from "@/lib/moon";
import { sunTimes } from "@/lib/sun";
import { addDays, extremesAround, fmtDur, fmtHm, jstHour, jstToday, predictedAt, rateAt, stageAt, type TideDay } from "@/lib/tideCalc";
import { loadHourlyMonth, loadPoints, loadPrediction, loadRealtime } from "@/lib/tideObs";

export type ViewerStation = {
  code: string;
  name: string;
  lat: number;
  lon: number;
  obsOffset: number | null; // 観測基準面 → 潮位表基準面 の換算（cm）。気象庁の観測がない地点は null
};

type ObsPoint = { h: number; cm: number };
type Obs = { pts: ObsPoint[]; source: "realtime" | "hourly"; lastDev: number | null; lastH: number | null; by?: string } | null;

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const dayLabel = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日（${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
};

function useDays(code: string, date: string) {
  const [days, setDays] = useState<Map<string, TideDay>>(new Map());
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  useEffect(() => {
    let alive = true;
    const years = [...new Set([addDays(date, -1), date, addDays(date, 1)].map((d) => Number(d.slice(0, 4))))];
    setState("loading");
    Promise.all(years.map((y) => loadPrediction(code, y))).then((rs) => {
      if (!alive) return;
      setDays((old) => {
        const m = new Map(old);
        for (const r of rs) for (const d of r ?? []) m.set(d.date, d);
        return m;
      });
      setState(rs.some((r) => r?.length) ? "ok" : "none");
    });
    return () => {
      alive = false;
    };
  }, [code, date]);
  return { days, state };
}

// その日の実測。最近の約1か月は「潮位観測情報」（5分ごと）、それより前は「潮汐観測資料」（毎時）
function useObs(st: ViewerStation, date: string, days: Map<string, TideDay>, tick: number, enabled = true): Obs {
  const [obs, setObs] = useState<Obs>(null);
  const ready = days.has(date);
  useEffect(() => {
    let alive = true;
    setObs(null);
    if (!enabled || !ready || date > jstToday()) return;
    (async () => {
      const points = await loadPoints();
      const pt = points?.find((p) => p.code === st.code);
      const ageDays = (Date.parse(jstToday()) - Date.parse(date)) / 86400e3;
      if (pt && ageDays <= 30) {
        const r = await loadRealtime(pt.point, date);
        if (r && alive) {
          const pts: ObsPoint[] = [];
          r.h.forEach((h, i) => {
            const p = predictedAt(days, date, h);
            if (p != null) pts.push({ h, cm: p + r.dev[i] });
          });
          if (pts.length) {
            setObs({ pts, source: "realtime", lastDev: r.dev[r.dev.length - 1], lastH: r.h[r.h.length - 1], by: pt.name });
            return;
          }
        }
      }
      if (st.obsOffset == null) return;
      const [y, m] = date.split("-").map(Number);
      const month = await loadHourlyMonth(st.code, y, m, st.obsOffset);
      const row = month?.find((d) => d.date === date);
      if (!row || !alive) return;
      const pts: ObsPoint[] = [];
      row.level.forEach((v, h) => v != null && pts.push({ h, cm: v }));
      if (!pts.length) return;
      const last = pts[pts.length - 1];
      const pl = predictedAt(days, date, last.h);
      setObs({ pts, source: "hourly", lastDev: pl == null ? null : last.cm - pl, lastH: last.h });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.code, date, ready, tick, enabled]);
  return obs;
}

function NowCard({ st, days, obs, nowH }: { st: ViewerStation; days: Map<string, TideDay>; obs: Obs; nowH: number }) {
  const today = jstToday();
  const stage = stageAt(days, today, nowH);
  const level = predictedAt(days, today, nowH);
  const rate = rateAt(days, today, nowH);
  if (!stage || level == null) return null;
  const freshObs = obs && obs.lastH != null && nowH - obs.lastH < 3 ? obs : null;
  const obsNow = freshObs ? freshObs.pts[freshObs.pts.length - 1] : null;
  return (
    <section className="tv-now" aria-label="いまの潮">
      <div className="tv-now-main">
        <span className="tv-k">{st.name}のいまの潮</span>
        <strong className={stage.dir === "up" ? "tv-up" : "tv-down"}>{stage.label}</strong>
        <span className="tv-k">
          {stage.dir === "up" ? "▲ 上げ潮" : "▼ 下げ潮"}
          {rate != null && `（${Math.abs(Math.round(rate))}cm/時）`}
        </span>
      </div>
      <div className="tv-bar" role="img" aria-label={`前の${stage.prev.kind === "high" ? "満潮" : "干潮"}から${Math.round(stage.progress * 100)}%`}>
        <span className="tv-bar-end">
          {stage.prev.kind === "high" ? "満" : "干"} {stage.prev.time}
        </span>
        <span className="tv-bar-track">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ left: `${(i + 1) * 10}%` }} />
          ))}
          <b style={{ left: `${stage.progress * 100}%` }} />
        </span>
        <span className="tv-bar-end">
          {stage.next.kind === "high" ? "満" : "干"} {stage.next.time}
        </span>
      </div>
      <dl className="tv-now-grid">
        <div>
          <dt>推算潮位</dt>
          <dd>
            {Math.round(level)}
            <small>cm</small>
          </dd>
        </div>
        <div>
          <dt>実測{obsNow ? `（${fmtHm(obsNow.h)}）` : ""}</dt>
          <dd>
            {obsNow ? (
              <>
                {Math.round(obsNow.cm)}
                <small>cm</small>
                {freshObs?.lastDev != null && <small className="tv-dev"> {freshObs.lastDev >= 0 ? "+" : ""}{Math.round(freshObs.lastDev)}</small>}
              </>
            ) : (
              <small>{st.obsOffset == null && !obs ? "観測なし" : "―"}</small>
            )}
          </dd>
        </div>
        <div>
          <dt>次の{stage.next.kind === "high" ? "満潮" : "干潮"}</dt>
          <dd>
            {stage.next.time}
            <small className="tv-sub">あと{fmtDur(stage.next.at - nowH)}</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Graph({ st, date, days, obs, nowH }: { st: ViewerStation; date: string; days: Map<string, TideDay>; obs: Obs; nowH: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const W = 360;
  const H = 190;
  const L = 34;
  const R = 6;
  const T = 22;
  const B = 22;
  const ex = useMemo(() => extremesAround(days, date), [days, date]);
  const pred = useMemo(() => {
    const out: ObsPoint[] = [];
    for (let h = 0; h <= 24.001; h += 0.25) {
      const v = predictedAt(days, date, h, ex);
      if (v != null) out.push({ h, cm: v });
    }
    return out;
  }, [days, date, ex]);
  if (pred.length < 10) return null;
  // 偏差補正予測：いまの潮位偏差がこの先も続くとしたときの見込み（今日だけ）
  const corr: ObsPoint[] =
    nowH != null && obs?.lastDev != null && obs.lastH != null && nowH - obs.lastH < 3
      ? pred.filter((p) => p.h >= obs.lastH!).map((p) => ({ h: p.h, cm: p.cm + obs.lastDev! }))
      : [];
  const all = [...pred, ...(obs?.pts ?? []), ...corr].map((p) => p.cm);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 + 4;
  const y0 = lo - pad;
  const y1 = hi + pad;
  const x = (h: number) => L + (h / 24) * (W - L - R);
  const y = (cm: number) => T + (1 - (cm - y0) / (y1 - y0)) * (H - T - B);
  const path = (pts: ObsPoint[], gap = 0.6) =>
    pts
      .map((p, i) => `${i === 0 || p.h - pts[i - 1].h > gap ? "M" : "L"}${x(p.h).toFixed(1)},${y(p.cm).toFixed(1)}`)
      .join(" ");
  const sun = sunTimes(date, st.lat, st.lon);
  const step = y1 - y0 > 250 ? 100 : y1 - y0 > 100 ? 50 : y1 - y0 > 40 ? 20 : 10;
  const ticks: number[] = [];
  for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks.push(v);
  const marks = ex.filter((e) => e.at >= 0 && e.at <= 24);
  const obsAt = (h: number) => {
    const pts = obs?.pts ?? [];
    let best: ObsPoint | null = null;
    for (const p of pts) if (!best || Math.abs(p.h - h) < Math.abs(best.h - h)) best = p;
    return best && Math.abs(best.h - h) <= (obs?.source === "hourly" ? 0.5 : 0.1) ? best : null;
  };
  const onMove = (e: React.PointerEvent) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.min(24, Math.max(0, ((px - L) / (W - L - R)) * 24)));
  };
  const hv = hover ?? null;
  const hp = hv != null ? predictedAt(days, date, hv, ex) : null;
  const ho = hv != null ? obsAt(hv) : null;
  return (
    <div className="tv-graph">
      <p className="tv-readout" aria-live="polite">
        {hv != null && hp != null ? (
          <>
            <b>{fmtHm(hv)}</b> 推算 {Math.round(hp)}cm
            {ho && (
              <>
                ／<span className="tv-o">実測 {Math.round(ho.cm)}cm</span>（{ho.cm - hp >= 0 ? "+" : ""}
                {Math.round(ho.cm - hp)}）
              </>
            )}
          </>
        ) : (
          <span className="tv-k">グラフをなぞると、その時刻の潮位が出ます</span>
        )}
      </p>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="tv-svg"
        role="img"
        aria-label={`${dayLabel(date)}の潮位（推算と実測）`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {sun && (
          <>
            <rect x={x(0)} y={T} width={x(sun.rise) - x(0)} height={H - T - B} className="tv-night" />
            <rect x={x(sun.set)} y={T} width={x(24) - x(sun.set)} height={H - T - B} className="tv-night" />
          </>
        )}
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1={T} y2={H - B} className="tv-grid" />
            <text x={x(h)} y={H - 7} textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} className="tv-axis">
              {h}時
            </text>
          </g>
        ))}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="tv-grid sub" />
            <text x={L - 4} y={y(v) + 3} textAnchor="end" className="tv-axis">
              {v}
            </text>
          </g>
        ))}
        <path d={path(pred)} className="tv-pred" />
        {corr.length > 1 && <path d={path(corr)} className="tv-corr" />}
        {obs && obs.pts.length > 1 && <path d={path(obs.pts, obs.source === "hourly" ? 1.5 : 0.5)} className="tv-obs" />}
        {marks.map((m) => (
          <g key={m.kind + m.at}>
            <circle cx={x(m.at)} cy={y(m.cm)} r={3} className={m.kind === "high" ? "tv-hi" : "tv-lo"} />
            <text
              x={Math.min(Math.max(x(m.at), L + 26), W - R - 26)}
              y={m.kind === "high" ? Math.max(y(m.cm) - 7, T - 4) : Math.min(y(m.cm) + 14, H - B - 2)}
              textAnchor="middle"
              className="tv-mark"
            >
              {m.kind === "high" ? "満" : "干"}
              {m.time} {m.cm}
            </text>
          </g>
        ))}
        {nowH != null && <line x1={x(nowH)} x2={x(nowH)} y1={T} y2={H - B} className="tv-now-line" />}
        {hv != null && <line x1={x(hv)} x2={x(hv)} y1={T} y2={H - B} className="tv-hover" />}
      </svg>
      <ul className="tv-legend">
        <li>
          <i className="tv-l-pred" />
          推算潮位
        </li>
        <li>
          <i className="tv-l-obs" />
          実測潮位{obs ? (obs.source === "realtime" ? "（5分ごと）" : "（毎時）") : "（なし）"}
        </li>
        {corr.length > 1 && (
          <li>
            <i className="tv-l-corr" />
            いまのずれが続いた場合
          </li>
        )}
        <li>
          <i className="tv-l-night" />
          夜
        </li>
      </ul>
    </div>
  );
}

export default function TideViewer({ st, showNow = true }: { st: ViewerStation; showNow?: boolean }) {
  const [date, setDate] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [nowH, setNowH] = useState<number | null>(null);
  useEffect(() => {
    setDate(jstToday());
    setNowH(jstHour());
    const t = setInterval(() => {
      setNowH(jstHour());
      setTick((v) => v + 1);
    }, 5 * 60e3);
    return () => clearInterval(t);
  }, []);
  const today = date ? jstToday() : "";
  const sel = date ?? "2000-01-01";
  const { days, state } = useDays(st.code, sel);
  const todayDays = useDays(st.code, today || sel).days;
  const pastObs = useObs(st, sel, days, 0, sel !== today);
  const todayObs = useObs(st, today || sel, todayDays, tick, !!today);
  if (!date) return <p className="small">潮位を読み込み中…</p>;
  const isToday = date === today;
  const obs = isToday ? todayObs : pastObs;
  const min = addDays(today, -366);
  const max = addDays(today, 366);
  const go = (n: number) => setDate((d) => {
    const v = addDays(d ?? today, n);
    return v < min ? min : v > max ? max : v;
  });
  return (
    <div className="tv">
      {showNow && nowH != null && todayDays.has(today) && <NowCard st={st} days={todayDays} obs={todayObs} nowH={nowH} />}
      <div className="tv-nav">
        <button type="button" onClick={() => go(-1)} aria-label="前の日">
          ‹
        </button>
        <label className="tv-date">
          <span>
            {dayLabel(date)} <small>{moonInfo(date).tideName}</small>
          </span>
          <input type="date" value={date} min={min} max={max} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="日付を選ぶ" />
        </label>
        <button type="button" onClick={() => go(1)} aria-label="次の日">
          ›
        </button>
        {!isToday && (
          <button type="button" className="tv-today" onClick={() => setDate(today)}>
            今日
          </button>
        )}
      </div>
      {state === "loading" && !days.has(date) && <p className="small">潮位表を読み込み中…</p>}
      {state !== "loading" && !days.has(date) && <p className="small">この日の潮位表はまだ公開されていません。</p>}
      {days.has(date) && <Graph st={st} date={date} days={days} obs={obs} nowH={isToday ? nowH : null} />}
      {days.has(date) && (() => {
        const d = days.get(date)!;
        return (
          <p className="tv-hl small">
            満潮 {d.high.map((e) => `${e.time}（${e.cm}cm）`).join("・") || "なし"}　干潮 {d.low.map((e) => `${e.time}（${e.cm}cm）`).join("・") || "なし"}
          </p>
        );
      })()}
      {date > today && <p className="small tv-k">未来の日は推算潮位だけです。</p>}
      {date < today && !obs && days.has(date) && (
        <p className="small tv-k">この日の実測潮位は見つかりませんでした（気象庁が観測していない地点か、観測の欠けた日です）。</p>
      )}
    </div>
  );
}
