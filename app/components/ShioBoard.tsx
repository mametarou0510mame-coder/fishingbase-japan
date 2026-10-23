"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dirDeg, dirName, type DayResult, type Slot } from "@/lib/shio";

export type SpeciesTip = {
  species: string; // 指数の魚種名（例「アジ・サバ・イワシ」）
  methods: { name: string; count: number }[]; // 最近の釣果の釣り方
  guide: { slug: string; name: string; method: string } | null; // 魚種ページの定番の釣り方
};

type Props = {
  spotName: string;
  spotType: string;
  days: DayResult[];
  tips: Record<string, SpeciesTip>;
  recent: { species: string; days: number; maxSizeCm: number | null }[];
  recentFrom: string | null;
  recentTo: string | null;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const PX = 15; // 1時間の横幅
const DAYW = PX * 24;
const LABELW = 46;
const ROWS = { date: 26, tide: 136, axis: 16, index: 20, weather: 30, temp: 18, pop: 18, wind: 40, wave: 40, safe: 16 };

const jstNow = () => new Date(Date.now() + 9 * 3600e3);
const md = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { m, d, w: WEEK[wd], wd };
};
const weekendColor = (wd: number) => (wd === 0 ? "var(--float)" : wd === 6 ? "var(--sea-2)" : undefined);
const hm = (h: number) => {
  const t = Math.round(h * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const toneColor = (tone: DayResult["grade"]["tone"]) =>
  tone === "best" ? "var(--glow)" : tone === "good" ? "var(--tide)" : tone === "fair" ? "var(--sea-2)" : tone === "stop" ? "var(--float)" : "var(--muted)";
const safeColor = (lv: number) => (lv === 2 ? "var(--float)" : lv === 1 ? "var(--glow)" : "var(--tide)");
const safeWord = (lv: number) => (lv === 2 ? "見合わせ推奨" : lv === 1 ? "注意して" : "おおむね安全");
const windColor = (v: number | null) => (v == null ? "var(--muted)" : v >= 10 ? "var(--float)" : v >= 7 ? "var(--glow)" : "var(--sea-2)");
const waveColor = (v: number | null) => (v == null ? "var(--muted)" : v >= 1.5 ? "var(--float)" : v >= 1.0 ? "var(--glow)" : "var(--tide)");
// 指数を5段階の濃さに
const idxOpacity = (v: number) => (v >= 60 ? 0.95 : v >= 45 ? 0.7 : v >= 30 ? 0.48 : v >= 15 ? 0.28 : 0.12);

function WeatherIcon({ w, x, y, s = 18 }: { w: string | null; x: number; y: number; s?: number }) {
  const k = s / 18;
  const cloud = (
    <path d="M4 13.5a3.5 3.5 0 0 1 .9-6.9 4.6 4.6 0 0 1 8.7 1.3 2.8 2.8 0 0 1-.3 5.6Z" fill="var(--card)" stroke="var(--muted)" strokeWidth={1.4} />
  );
  let body: React.ReactNode;
  if (w === "晴れ")
    body = (
      <g stroke="var(--glow)" strokeWidth={1.6} strokeLinecap="round">
        <circle cx={9} cy={9} r={3.6} fill="var(--glow)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1={9} y1={2} x2={9} y2={3.4} transform={`rotate(${a} 9 9)`} />
        ))}
      </g>
    );
  else if (w === "くもり") body = cloud;
  else if (w === "雨")
    body = (
      <g>
        {cloud}
        <g stroke="var(--sea-2)" strokeWidth={1.5} strokeLinecap="round">
          <line x1={6} y1={15} x2={5} y2={17.5} />
          <line x1={10} y1={15} x2={9} y2={17.5} />
          <line x1={14} y1={15} x2={13} y2={17.5} />
        </g>
      </g>
    );
  else if (w === "雪")
    body = (
      <g>
        {cloud}
        <g fill="var(--sea-2)">
          <circle cx={6} cy={16.5} r={1.1} />
          <circle cx={10} cy={16.5} r={1.1} />
          <circle cx={14} cy={16.5} r={1.1} />
        </g>
      </g>
    );
  else return null;
  return <g transform={`translate(${x} ${y}) scale(${k})`}>{body}</g>;
}

function Icon({ w, size = 20 }: { w: string | null; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <WeatherIcon w={w} x={0} y={0} />
    </svg>
  );
}

// 向きの矢印（deg は「吹いてくる・来る」向き。矢印は進む向きに描く）
function Arrow({ deg, x, y, color, s = 1 }: { deg: number; x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg + 180}) scale(${s})`}>
      <path d="M0 -7 L4.5 3 L0 0.8 L-4.5 3 Z" fill={color} />
    </g>
  );
}

function MoonIcon({ age, size = 30 }: { age: number; size?: number }) {
  const p = (age % 29.53) / 29.53;
  const r = size / 2 - 1;
  const c = size / 2;
  const k = Math.cos(p * 2 * Math.PI); // 1=新月, -1=満月
  const waxing = p < 0.5;
  const rx = Math.abs(k) * r;
  const lit = `M${c} ${c - r} A${r} ${r} 0 0 ${waxing ? 1 : 0} ${c} ${c + r} A${rx} ${r} 0 0 ${(k > 0) === waxing ? 0 : 1} ${c} ${c - r}Z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="var(--sand)" stroke="var(--line)" />
      <path d={lit} fill="var(--glow)" />
    </svg>
  );
}

function ScoreRing({ score, color, size = 76, label }: { score: number | null; color: string; size?: number; label?: string }) {
  const r = size / 2 - 6;
  const len = 2 * Math.PI * r;
  const v = score ?? 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`釣りどき指数 ${score ?? "なし"}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={7} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${(len * v) / 100} ${len}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y={label ? "47%" : "54%"} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fontWeight={800} fill="var(--ink)">
        {score ?? "－"}
      </text>
      {label && (
        <text x="50%" y="70%" textAnchor="middle" fontSize={size * 0.12} fill="var(--muted)">
          {label}
        </text>
      )}
    </svg>
  );
}

function Timeline({ days, nowX, scroller }: { days: DayResult[]; nowX: number | null; scroller: React.RefObject<HTMLDivElement | null> }) {
  const W = days.length * DAYW;
  const all = days.flatMap((d) => d.tide.filter((v): v is number => v != null));
  const vMin = Math.min(...all);
  const vMax = Math.max(...all);
  const pad = (vMax - vMin) * 0.2 + 5;
  const lo = vMin - pad;
  const hi = vMax + pad;
  const top = ROWS.date;
  const y = (cm: number) => top + 10 + (1 - (cm - lo) / (hi - lo)) * (ROWS.tide - 20);
  const yAxis = top + ROWS.tide;
  const yIdx = yAxis + ROWS.axis;
  const yW = yIdx + ROWS.index;
  const yT = yW + ROWS.weather;
  const yP = yT + ROWS.temp;
  const yWind = yP + ROWS.pop;
  const yWave = yWind + ROWS.wind;
  const ySafe = yWave + ROWS.wave;
  const H = ySafe + ROWS.safe + 6;

  const pts: string[] = [];
  days.forEach((d, di) => {
    d.tide.forEach((v, h) => {
      if (v == null || (h === 24 && di < days.length - 1)) return;
      pts.push(`${(di * DAYW + h * PX).toFixed(1)},${y(v).toFixed(1)}`);
    });
  });
  const area = `M0,${yAxis} L${pts.join(" L")} L${W},${yAxis} Z`;
  const toH = (t: string) => {
    const [a, b] = t.split(":").map(Number);
    return a + b / 60;
  };

  const labels: [string, number, number][] = [
    ["潮位", top, ROWS.tide],
    ["時刻", yAxis, ROWS.axis],
    ["指数", yIdx, ROWS.index],
    ["天気", yW, ROWS.weather],
    ["気温", yT, ROWS.temp],
    ["降水", yP, ROWS.pop],
    ["風", yWind, ROWS.wind],
    ["波", yWave, ROWS.wave],
    ["安全", ySafe, ROWS.safe],
  ];

  return (
    <div className="shio-tl">
      <div className="shio-tl-labels" style={{ width: LABELW, height: H }}>
        {labels.map(([t, yy, hh]) => (
          <span key={t} style={{ top: yy, height: hh }}>
            {t}
          </span>
        ))}
        <span style={{ top: yWind + 26, height: 12 }} className="shio-unit">
          m/s
        </span>
      </div>
      <div className="shio-tl-scroll" ref={scroller}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="潮位と天気・風・波の時間ごとの推移">
          <defs>
            <pattern id="shio-hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={6} stroke="var(--line)" strokeWidth={2} />
            </pattern>
            <linearGradient id="shio-water" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sea-2)" stopOpacity={0.4} />
              <stop offset="1" stopColor="var(--sea-2)" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {days.map((d, di) => {
            const x0 = di * DAYW;
            const p = md(d.date);
            const best = d.hours.reduce((a, b) => (b.open && b.index > a.index ? b : a), { h: -1, index: -1, open: false });
            return (
              <g key={d.date}>
                {/* 日付の帯 */}
                <rect x={x0} y={0} width={DAYW} height={top} fill="var(--sand)" />
                <text x={x0 + 8} y={17} fontSize={12.5} fontWeight={800} fill={weekendColor(p.wd) ?? "var(--ink)"}>
                  {p.m}/{p.d}（{p.w}）
                </text>
                <text x={x0 + 84} y={17} fontSize={11} fill="var(--sea-2)" fontWeight={700}>
                  {d.tideName}
                </text>
                <g transform={`translate(${x0 + 112} 5)`}>
                  <rect width={34} height={16} rx={8} fill={toneColor(d.grade.tone)} />
                  <text x={17} y={12} fontSize={10.5} fontWeight={800} textAnchor="middle" fill="#10283f">
                    {d.score ?? "－"}
                  </text>
                </g>

                {/* 夜の帯・まずめ */}
                {d.sun && (
                  <>
                    <rect x={x0} y={top} width={d.sun.rise * PX} height={ROWS.tide} fill="var(--sea)" opacity={0.08} />
                    <rect x={x0 + d.sun.set * PX} y={top} width={(24 - d.sun.set) * PX} height={ROWS.tide} fill="var(--sea)" opacity={0.08} />
                    <rect x={x0 + (d.sun.rise - 1.5) * PX} y={top} width={3 * PX} height={ROWS.tide} fill="var(--glow)" opacity={0.16} />
                    <rect x={x0 + (d.sun.set - 1.5) * PX} y={top} width={3 * PX} height={ROWS.tide} fill="var(--glow)" opacity={0.16} />
                  </>
                )}
                {d.hours.map((h) =>
                  h.open ? null : <rect key={h.h} x={x0 + h.h * PX} y={top} width={PX} height={ROWS.tide} fill="url(#shio-hatch)" opacity={0.7} />,
                )}
                {di > 0 && <line x1={x0} y1={0} x2={x0} y2={H} stroke="var(--sea)" strokeOpacity={0.35} strokeWidth={1.5} />}
                {[6, 12, 18].map((h) => (
                  <line key={h} x1={x0 + h * PX} y1={top} x2={x0 + h * PX} y2={yAxis} stroke="var(--line)" strokeDasharray="2 3" />
                ))}
                {/* 時刻の目盛り */}
                <rect x={x0} y={yAxis} width={DAYW} height={ROWS.axis} fill="var(--card)" />
                {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                  <text key={h} x={x0 + h * PX + (h ? 0 : 8)} y={yAxis + 12} fontSize={10} fill="var(--muted)" textAnchor="middle">
                    {h}
                  </text>
                ))}
                {/* 指数リボン */}
                {d.hours.map((h) => (
                  <rect
                    key={h.h}
                    x={x0 + h.h * PX + 0.5}
                    y={yIdx + 3}
                    width={PX - 1}
                    height={ROWS.index - 6}
                    rx={2.5}
                    fill={h.open ? (h.index >= 70 ? "var(--glow)" : "var(--tide)") : "url(#shio-hatch)"}
                    opacity={h.open ? (h.index >= 70 ? 1 : idxOpacity(h.index)) : 1}
                  >
                    <title>{`${p.m}/${p.d} ${h.h}時 釣りどき指数 ${h.open ? h.index : "営業時間外"}`}</title>
                  </rect>
                ))}
                {best.h >= 0 && best.index >= 45 && (
                  <g transform={`translate(${x0 + best.h * PX + PX / 2} ${yIdx + 2})`}>
                    <path d="M-4 -6 L4 -6 L0 -1 Z" fill="var(--ink)" />
                  </g>
                )}
                {/* 満潮・干潮 */}
                {d.high.map((e) => (
                  <g key={"h" + e.time}>
                    <circle cx={x0 + toH(e.time) * PX} cy={y(e.cm)} r={3.2} fill="var(--card)" stroke="var(--sea)" strokeWidth={2} />
                    <text x={x0 + toH(e.time) * PX} y={y(e.cm) - 8} fontSize={10.5} textAnchor="middle" fill="var(--sea)" fontWeight={800}>
                      満 {e.time}
                    </text>
                  </g>
                ))}
                {d.low.map((e) => (
                  <g key={"l" + e.time}>
                    <circle cx={x0 + toH(e.time) * PX} cy={y(e.cm)} r={3.2} fill="var(--card)" stroke="var(--sea-2)" strokeWidth={2} />
                    <text x={x0 + toH(e.time) * PX} y={y(e.cm) + 16} fontSize={10.5} textAnchor="middle" fill="var(--sea-2)" fontWeight={700}>
                      干 {e.time}
                    </text>
                  </g>
                ))}
                {/* 3時間ごとの段 */}
                {d.slots.map((s: Slot, k) => {
                  const cx = x0 + (s.hour + 1.5) * PX;
                  const sf = d.slotSafety[k];
                  const wc = windColor(s.windMax);
                  const vc = waveColor(s.swh);
                  const wd = dirDeg(s.windDir);
                  return (
                    <g key={k}>
                      {k > 0 && <line x1={x0 + s.hour * PX} y1={yW + 4} x2={x0 + s.hour * PX} y2={ySafe} stroke="var(--line)" strokeWidth={0.7} />}
                      <WeatherIcon w={s.weather} x={cx - 10} y={yW + 5} s={20} />
                      <text x={cx} y={yT + 13} fontSize={11.5} textAnchor="middle" fill="var(--ink)">
                        {s.temp != null ? `${s.temp}°` : ""}
                      </text>
                      <text x={cx} y={yP + 13} fontSize={11} textAnchor="middle" fill={s.pop != null && s.pop >= 50 ? "var(--sea-2)" : "var(--muted)"} fontWeight={s.pop != null && s.pop >= 50 ? 700 : 400}>
                        {s.pop != null ? `${s.pop}%` : ""}
                      </text>
                      {/* 風 */}
                      {s.windMax != null && <rect x={cx - 19} y={yWind + 3} width={38} height={34} rx={8} fill={wc} fillOpacity={0.12} />}
                      {wd != null && <Arrow deg={wd} x={cx} y={yWind + 13} color={wc} />}
                      <text x={cx} y={yWind + 32} fontSize={11.5} textAnchor="middle" fill={wc} fontWeight={700}>
                        {s.windMax != null ? `${s.windEst ? "≧" : ""}${s.windMax}` : "－"}
                      </text>
                      {/* 波 */}
                      {s.swh != null && <rect x={cx - 19} y={yWave + 3} width={38} height={34} rx={8} fill={vc} fillOpacity={0.12} />}
                      {s.mwd != null && <Arrow deg={s.mwd} x={cx} y={yWave + 13} color={vc} />}
                      <text x={cx} y={yWave + 32} fontSize={11.5} textAnchor="middle" fill={s.swh != null ? "var(--ink)" : "var(--muted)"} fontWeight={700} fontStyle={s.waveEst ? "italic" : "normal"}>
                        {s.swh != null ? `${s.waveEst ? "約" : ""}${s.swh.toFixed(1)}` : "－"}
                      </text>
                      {/* 安全 */}
                      <rect x={x0 + s.hour * PX + 3} y={ySafe + 3} width={3 * PX - 6} height={9} rx={4.5} fill={safeColor(sf.level)} opacity={0.9}>
                        <title>{`${s.hour}〜${s.hour + 3}時 ${safeWord(sf.level)}${sf.reasons.length ? "：" + sf.reasons.join("、") : ""}`}</title>
                      </rect>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <path d={area} fill="url(#shio-water)" />
          <polyline points={pts.join(" ")} fill="none" stroke="var(--sea-2)" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
          {nowX != null && (
            <g>
              <line x1={nowX} y1={top} x2={nowX} y2={H} stroke="var(--float)" strokeWidth={1.6} />
              <rect x={nowX - 16} y={top + 2} width={32} height={15} rx={7.5} fill="var(--float)" />
              <text x={nowX} y={top + 13} fontSize={10} textAnchor="middle" fill="#fff" fontWeight={800}>
                いま
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// いまの潮位・次の満干・いまの海
function NowPanel({ t0, t1, nowH }: { t0: DayResult; t1: DayResult | undefined; nowH: number }) {
  const h = Math.floor(nowH);
  const a = t0.tide[h];
  const b = t0.tide[h + 1];
  if (a == null || b == null) return null;
  const level = Math.round(a + (b - a) * (nowH - h));
  const rate = b - a;
  const evs = [
    ...t0.high.map((e) => ({ ...e, kind: "満潮", day: 0 })),
    ...t0.low.map((e) => ({ ...e, kind: "干潮", day: 0 })),
    ...(t1 ? [...t1.high.map((e) => ({ ...e, kind: "満潮", day: 1 })), ...t1.low.map((e) => ({ ...e, kind: "干潮", day: 1 }))] : []),
  ]
    .map((e) => {
      const [hh, mm] = e.time.split(":").map(Number);
      return { ...e, at: e.day * 24 + hh + mm / 60 };
    })
    .sort((x, y) => x.at - y.at);
  const next = evs.find((e) => e.at > nowH);
  const prev = [...evs].reverse().find((e) => e.at <= nowH);
  const progress = next && prev ? Math.min(1, Math.max(0, (nowH - prev.at) / (next.at - prev.at))) : null;
  const k = Math.min(7, Math.floor(nowH / 3));
  const slot = t0.slots[k];
  const sf = t0.slotSafety[k];
  const cur = t0.hours[h];
  return (
    <section className="shio-now" aria-label="いまの海">
      <div className="shio-now-head">
        <div className="shio-now-tide">
          <span className="shio-k">いまの潮位</span>
          <strong>
            {level}
            <small>cm</small>
          </strong>
          <span className={rate >= 0 ? "shio-up" : "shio-down"}>
            {rate >= 0 ? "▲ 上げ潮" : "▼ 下げ潮"}
            <small> {Math.abs(rate)}cm/時</small>
          </span>
        </div>
        <ScoreRing score={cur?.open ? cur.index : null} color={cur && cur.index >= 70 ? "var(--glow)" : "var(--tide)"} size={64} label="いまの指数" />
      </div>
      {next && (
        <div className="shio-next">
          <span>
            {prev ? `${prev.kind} ${prev.time}` : ""}
          </span>
          <span className="shio-next-bar">
            <i style={{ width: `${(progress ?? 0) * 100}%` }} />
          </span>
          <span>
            <b>
              {next.kind} {next.day ? "明日" : ""}
              {next.time}
            </b>{" "}
            あと{hm(next.at - nowH)}
          </span>
        </div>
      )}
      <div className="shio-tiles">
        <div>
          <Icon w={slot?.weather ?? null} size={22} />
          <span className="shio-k">天気</span>
          <b>
            {slot?.weather ?? "－"}
            {slot?.temp != null ? ` ${slot.temp}°` : ""}
          </b>
        </div>
        <div>
          <svg width={22} height={22} viewBox="-11 -11 22 22" aria-hidden>
            {dirDeg(slot?.windDir ?? null) != null && <Arrow deg={dirDeg(slot!.windDir)!} x={0} y={0} color={windColor(slot?.windMax ?? null)} s={1.3} />}
          </svg>
          <span className="shio-k">風</span>
          <b style={{ color: windColor(slot?.windMax ?? null) }}>
            {slot?.windMax != null ? `${slot.windDir ?? ""} ${slot.windMin != null ? `${slot.windMin}〜` : ""}${slot.windMax}m/s` : "－"}
          </b>
        </div>
        <div>
          <svg width={22} height={22} viewBox="-11 -11 22 22" aria-hidden>
            {slot?.mwd != null && <Arrow deg={slot.mwd} x={0} y={0} color={waveColor(slot.swh)} s={1.3} />}
          </svg>
          <span className="shio-k">波</span>
          <b>
            {slot?.swh != null ? `${slot.swh.toFixed(1)}m` : "－"}
            {slot?.mwp != null ? <small> {Math.round(slot.mwp)}秒{slot.mwd != null ? `・${dirName(slot.mwd)}から` : ""}</small> : null}
          </b>
        </div>
        <div style={{ borderColor: safeColor(sf?.level ?? 0) }} className="shio-tile-safe">
          <span className="shio-dot" style={{ background: safeColor(sf?.level ?? 0), width: 14, height: 14 }} />
          <span className="shio-k">安全</span>
          <b style={{ color: safeColor(sf?.level ?? 0) }}>{sf ? safeWord(sf.level) : "－"}</b>
        </div>
      </div>
      {sf && sf.reasons.length > 0 && <p className="small shio-now-why">{sf.reasons.join("、")}</p>}
    </section>
  );
}

const stageColor = (s: string) => (s === "最盛期" ? "var(--glow)" : s === "シーズン中" ? "var(--tide)" : "var(--line)");

export default function ShioBoard({ spotName, spotType, days: allDays, tips, recent, recentFrom, recentTo }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(jstNow());
    const t = setInterval(() => setNow(jstNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  const today = (now ?? jstNow()).toISOString().slice(0, 10);
  const days = useMemo(() => {
    const i = allDays.findIndex((d) => d.date === today);
    return i < 0 ? allDays : allDays.slice(i);
  }, [allDays, today]);
  const [sel, setSel] = useState(0);
  const scroller = useRef<HTMLDivElement | null>(null);
  const isToday = days[0]?.date === today;
  const nowH = now ? now.getUTCHours() + now.getUTCMinutes() / 60 : null;
  const startX = (h: number) => Math.max(0, (h - 5) * PX);

  // 最初は「いま」の少し前が見えるように
  useEffect(() => {
    if (!scroller.current || nowH === null || !isToday) return;
    scroller.current.scrollLeft = startX(nowH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, now === null]);

  if (!days.length) return <p className="small">潮位表のデータを準備中です。</p>;

  const pick = (i: number) => {
    setSel(i);
    scroller.current?.scrollTo({ left: i === 0 && isToday && nowH !== null ? startX(nowH) : i * DAYW, behavior: "smooth" });
  };

  const d = days[Math.min(sel, days.length - 1)];
  const { m, d: dd, w } = md(d.date);

  return (
    <div className="shio">
      <nav className="shio-days" aria-label="日付を選ぶ">
        {days.slice(0, 8).map((x, i) => {
          const p = md(x.date);
          return (
            <button key={x.date} type="button" className={i === sel ? "on" : ""} onClick={() => pick(i)} aria-pressed={i === sel}>
              <span className="shio-dd" style={{ color: weekendColor(p.wd) }}>
                {i === 0 && isToday ? "今日" : `${p.m}/${p.d}`}
                <small>{p.w}</small>
              </span>
              <span className="shio-tn">{x.tideName}</span>
              <Icon w={x.slots[4]?.weather ?? null} size={22} />
              <span className="shio-sc" style={{ color: toneColor(x.grade.tone), borderColor: toneColor(x.grade.tone) }}>
                {x.score ?? "－"}
              </span>
              <span className="shio-tag">{x.partial ? "予報前" : "\u00a0"}</span>
              <span className="shio-safebar" style={{ background: safeColor(x.safety.level) }} title={safeWord(x.safety.level)} />
            </button>
          );
        })}
      </nav>

      {isToday && nowH !== null && sel === 0 && <NowPanel t0={days[0]} t1={days[1]} nowH={nowH} />}

      <Timeline days={days} nowX={isToday && nowH !== null ? nowH * PX : null} scroller={scroller} />
      <ul className="shio-legend">
        <li>
          <i style={{ background: "var(--glow)", opacity: 0.6 }} />
          まずめ
        </li>
        <li>
          <i style={{ background: "var(--tide)" }} />
          指数（濃いほど高い・▼は一番の時間）
        </li>
        <li>
          <i className="hatch" />
          営業時間外
        </li>
        <li>
          <i style={{ background: "var(--tide)", borderRadius: 4 }} />
          安全
          <i style={{ background: "var(--glow)", borderRadius: 4, marginLeft: 6 }} />
          注意
          <i style={{ background: "var(--float)", borderRadius: 4, marginLeft: 6 }} />
          見合わせ
        </li>
        <li>風はm/s・波はm。「≧」「約」は見積もり、「－」は予報前</li>
      </ul>

      <section className="shio-day" aria-label={`${m}月${dd}日の詳しい情報`}>
        <header style={{ borderLeftColor: toneColor(d.grade.tone) }}>
          <ScoreRing score={d.score} color={toneColor(d.grade.tone)} label="釣りどき" />
          <div>
            <p className="shio-k">
              <span style={{ color: weekendColor(md(d.date).wd) }}>
                {m}月{dd}日（{w}）
              </span>
              ・{d.tideName}・月齢{d.moonAge.toFixed(1)}
            </p>
            <h3>
              <span style={{ color: toneColor(d.grade.tone) }}>{d.grade.mark}</span> {d.grade.label}
              {d.partial && <small className="shio-k">（風・波の予報前。潮と時間帯だけの目安）</small>}
            </h3>
            {d.grade.tone === "stop" ? (
              <p className="small">風・波・雨などで危ない時間が多いため、この日は釣行をおすすめしません。</p>
            ) : d.windows.length ? (
              <ul className="shio-windows">
                {d.windows.map((x) => (
                  <li key={x.from}>
                    <b>
                      {x.from}〜{x.to}時
                    </b>
                    <span>{x.reasons.join("・") || "潮・時間帯"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small">目立つねらい目はありません</p>
            )}
          </div>
        </header>

        <div className="shio-cards">
          <div className="shio-card" style={{ borderTopColor: safeColor(d.safety.level) }}>
            <h4>安全の目安</h4>
            <p className="shio-big" style={{ color: safeColor(d.safety.level) }}>
              {safeWord(d.safety.level)}
            </p>
            {d.safety.reasons.length > 0 && (
              <ul>
                {d.safety.reasons.slice(0, 5).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <p className="small">
              {spotType === "沖堤防（渡船）"
                ? "沖堤防は逃げ場がありません。渡船店の出船判断に従い、ライフジャケットを必ず着けてください。"
                : spotType === "一般の釣り場"
                  ? "柵のない場所では、風や波が弱くてもライフジャケットを着けましょう。"
                  : "荒天時は施設が休業・閉鎖することがあります。出かける前に施設の案内をご確認ください。"}
            </p>
          </div>

          <div className="shio-card">
            <h4>潮と日・月</h4>
            <dl className="shio-dl">
              <dt>満潮</dt>
              <dd>
                {d.high.length
                  ? d.high.map((e) => (
                      <span key={e.time}>
                        <b>{e.time}</b>
                        <small>{e.cm}cm</small>
                      </span>
                    ))
                  : "－"}
              </dd>
              <dt>干潮</dt>
              <dd>
                {d.low.length
                  ? d.low.map((e) => (
                      <span key={e.time}>
                        <b>{e.time}</b>
                        <small>{e.cm}cm</small>
                      </span>
                    ))
                  : "－"}
              </dd>
              <dt>日の出・入り</dt>
              <dd>
                {d.sun ? (
                  <>
                    <span>
                      <b>{hm(d.sun.rise)}</b>
                      <small>日の出</small>
                    </span>
                    <span>
                      <b>{hm(d.sun.set)}</b>
                      <small>日の入り</small>
                    </span>
                  </>
                ) : (
                  "－"
                )}
              </dd>
              <dt>月</dt>
              <dd className="shio-moon">
                <MoonIcon age={d.moonAge} size={22} /> 月齢{d.moonAge.toFixed(1)}・{d.tideName}
              </dd>
            </dl>
          </div>

          {d.jma && (
            <div className="shio-card">
              <h4>気象庁の予報</h4>
              <dl className="shio-dl shio-dl-text">
                <dt>天気</dt>
                <dd>{d.jma.weather}</dd>
                <dt>風</dt>
                <dd>{d.jma.wind}</dd>
                <dt>波</dt>
                <dd>{d.jma.wave || "－"}</dd>
              </dl>
            </div>
          )}
        </div>

        <h4 className="shio-h4">この日に狙える魚とおすすめの釣り方</h4>
        {d.species?.length ? (
          <ul className="shio-fish">
            {d.species.slice(0, 4).map((s) => {
              const tip = tips[s.species];
              return (
                <li key={s.species}>
                  <div className="shio-fish-top">
                    <b>{s.species}</b>
                    <span className="shio-stage" style={{ borderColor: stageColor(s.stage), color: s.stage === "シーズン外" ? "var(--muted)" : "var(--ink)" }}>
                      {s.stage}
                    </span>
                    <span className="shio-bar">
                      <span style={{ width: `${s.index}%` }} />
                    </span>
                    <span className="shio-k">{s.index}</span>
                  </div>
                  <p className="small">
                    {tip?.methods.length ? (
                      <>
                        最近の釣果：
                        {tip.methods.slice(0, 3).map((x) => (
                          <span key={x.name} className="shio-method">
                            {x.name}
                            <small>{x.count}件</small>
                          </span>
                        ))}
                      </>
                    ) : tip?.guide ? (
                      <>
                        定番：<span className="shio-method">{tip.guide.method}</span>
                      </>
                    ) : (
                      "釣り方の情報はまだありません"
                    )}
                    {tip?.guide && (
                      <>
                        {" "}
                        <Link href={`/species/${tip.guide.slug}/`}>{tip.guide.name}の釣り方 →</Link>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="small">この釣り場は釣果データが少ないため、魚ごとの指数はまだ出せません。</p>
        )}

        {recent.length > 0 && (
          <>
            <h4 className="shio-h4">
              最近の釣果
              <small className="shio-k">
                （施設の公式情報{recentFrom && recentTo ? `、${recentFrom.slice(5).replace("-", "/")}〜${recentTo.slice(5).replace("-", "/")}` : ""}）
              </small>
            </h4>
            <ul className="shio-recent">
              {recent.slice(0, 6).map((r) => (
                <li key={r.species}>
                  <b>{r.species}</b> {r.days}日{r.maxSizeCm ? `・最大${r.maxSizeCm}cm` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <p className="small shio-for">{spotName}の潮・海況ボード</p>
    </div>
  );
}
