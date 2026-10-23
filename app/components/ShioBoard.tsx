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
const PX = 14; // 1時間の横幅
const DAYW = PX * 24;
const LABELW = 50;
const ROWS = { date: 20, tide: 132, index: 16, weather: 28, temp: 18, pop: 18, wind: 34, wave: 34, safe: 18 };

const jstNow = () => new Date(Date.now() + 9 * 3600e3);
const md = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return { m, d, w: WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
};
const hm = (h: number) => {
  const t = Math.round(h * 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const toneColor = (tone: DayResult["grade"]["tone"]) =>
  tone === "best" ? "var(--glow)" : tone === "good" ? "var(--tide)" : tone === "fair" ? "var(--sea-2)" : tone === "stop" ? "var(--float)" : "var(--muted)";
const safeColor = (lv: number) => (lv === 2 ? "var(--float)" : lv === 1 ? "var(--glow)" : "var(--tide)");
const safeWord = (lv: number) => (lv === 2 ? "見合わせ推奨" : lv === 1 ? "注意して" : "おおむね安全");

function WeatherIcon({ w, x, y, s = 18 }: { w: string | null; x: number; y: number; s?: number }) {
  const k = s / 18;
  const cloud = (
    <path
      d="M4 13.5a3.5 3.5 0 0 1 .9-6.9 4.6 4.6 0 0 1 8.7 1.3 2.8 2.8 0 0 1-.3 5.6Z"
      fill="var(--card)"
      stroke="var(--muted)"
      strokeWidth={1.4}
    />
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
  else return w ? <text x={x + s / 2} y={y + s * 0.7} textAnchor="middle" fontSize={9} fill="var(--muted)">{w.slice(0, 2)}</text> : null;
  return <g transform={`translate(${x} ${y}) scale(${k})`}>{body}</g>;
}

// 向きの矢印（deg は「吹いてくる・来る」向き。矢印は進む向きに描く）
function Arrow({ deg, x, y, color }: { deg: number; x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg + 180})`}>
      <path d="M0 -7 L4.5 3 L0 0.8 L-4.5 3 Z" fill={color} />
    </g>
  );
}

function MoonIcon({ age, size = 30 }: { age: number; size?: number }) {
  // 月齢から光っている側の形を描く（簡易）
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

function ScoreRing({ score, color, size = 76 }: { score: number | null; color: string; size?: number }) {
  const r = size / 2 - 6;
  const len = 2 * Math.PI * r;
  const v = score ?? 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
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
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fontWeight={700} fill="var(--ink)">
        {score ?? "－"}
      </text>
    </svg>
  );
}

function Timeline({ days, nowX, scroller }: { days: DayResult[]; nowX: number | null; scroller: React.RefObject<HTMLDivElement | null> }) {
  const W = days.length * DAYW;
  const all = days.flatMap((d) => d.tide.filter((v): v is number => v != null));
  const vMin = Math.min(...all);
  const vMax = Math.max(...all);
  const pad = (vMax - vMin) * 0.18 + 5;
  const lo = vMin - pad;
  const hi = vMax + pad;
  const top = ROWS.date;
  const y = (cm: number) => top + 8 + (1 - (cm - lo) / (hi - lo)) * (ROWS.tide - 16);
  const yIdx = top + ROWS.tide;
  const yW = yIdx + ROWS.index;
  const yT = yW + ROWS.weather;
  const yP = yT + ROWS.temp;
  const yWind = yP + ROWS.pop;
  const yWave = yWind + ROWS.wind;
  const ySafe = yWave + ROWS.wave;
  const H = ySafe + ROWS.safe;

  const pts: string[] = [];
  days.forEach((d, di) => {
    d.tide.forEach((v, h) => {
      if (v == null || (h === 24 && di < days.length - 1)) return;
      pts.push(`${(di * DAYW + h * PX).toFixed(1)},${y(v).toFixed(1)}`);
    });
  });
  const area = `M0,${top + ROWS.tide} L${pts.join(" L")} L${W},${top + ROWS.tide} Z`;
  const toH = (t: string) => {
    const [a, b] = t.split(":").map(Number);
    return a + b / 60;
  };

  const labels: [string, number, number][] = [
    ["潮位", top, ROWS.tide],
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
      </div>
      <div className="shio-tl-scroll" ref={scroller}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="潮位と天気・風・波の時間ごとの推移">
          <defs>
            <pattern id="shio-hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={6} stroke="var(--line)" strokeWidth={2} />
            </pattern>
            <linearGradient id="shio-water" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sea-2)" stopOpacity={0.35} />
              <stop offset="1" stopColor="var(--sea-2)" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          {days.map((d, di) => {
            const x0 = di * DAYW;
            const { m, d: dd, w } = md(d.date);
            return (
              <g key={d.date}>
                {/* 夜の帯・まずめ */}
                {d.sun && (
                  <>
                    <rect x={x0} y={top} width={d.sun.rise * PX} height={ROWS.tide} fill="var(--sea)" opacity={0.07} />
                    <rect x={x0 + d.sun.set * PX} y={top} width={(24 - d.sun.set) * PX} height={ROWS.tide} fill="var(--sea)" opacity={0.07} />
                    <rect x={x0 + (d.sun.rise - 1.5) * PX} y={top} width={3 * PX} height={ROWS.tide} fill="var(--glow)" opacity={0.13} />
                    <rect x={x0 + (d.sun.set - 1.5) * PX} y={top} width={3 * PX} height={ROWS.tide} fill="var(--glow)" opacity={0.13} />
                  </>
                )}
                {/* 営業時間外 */}
                {d.hours.map((h) =>
                  h.open ? null : <rect key={h.h} x={x0 + h.h * PX} y={top} width={PX} height={ROWS.tide} fill="url(#shio-hatch)" opacity={0.7} />,
                )}
                {/* 日付 */}
                <line x1={x0} y1={0} x2={x0} y2={H} stroke="var(--line)" strokeWidth={di ? 1.5 : 0} />
                <text x={x0 + 6} y={14} fontSize={11.5} fontWeight={700} fill="var(--ink)">
                  {m}/{dd}({w})
                </text>
                <text x={x0 + 62} y={14} fontSize={10.5} fill="var(--muted)">
                  {d.tideName}
                </text>
                {[6, 12, 18].map((h) => (
                  <g key={h}>
                    <line x1={x0 + h * PX} y1={top} x2={x0 + h * PX} y2={top + ROWS.tide} stroke="var(--line)" strokeDasharray="2 3" />
                    {h > 6 && <text x={x0 + h * PX} y={14} fontSize={9.5} fill="var(--muted)" textAnchor="middle">
                      {h}時
                    </text>}
                  </g>
                ))}
                {/* 指数リボン */}
                {d.hours.map((h) => (
                  <rect
                    key={h.h}
                    x={x0 + h.h * PX + 0.5}
                    y={yIdx + 2}
                    width={PX - 1}
                    height={ROWS.index - 4}
                    rx={2}
                    fill={h.open ? (h.index >= 70 ? "var(--glow)" : "var(--tide)") : "url(#shio-hatch)"}
                    opacity={h.open ? (h.index >= 70 ? 1 : 0.12 + (0.85 * h.index) / 100) : 1}
                  >
                    <title>{`${md(d.date).m}/${md(d.date).d} ${h.h}時 釣りどき指数 ${h.open ? h.index : "営業時間外"}`}</title>
                  </rect>
                ))}
                {/* 満潮・干潮 */}
                {d.high.map((e) => (
                  <g key={"h" + e.time}>
                    <circle cx={x0 + toH(e.time) * PX} cy={y(e.cm)} r={3} fill="var(--sea)" />
                    <text x={x0 + toH(e.time) * PX} y={y(e.cm) - 7} fontSize={10} textAnchor="middle" fill="var(--sea)" fontWeight={700}>
                      満 {e.time}
                    </text>
                  </g>
                ))}
                {d.low.map((e) => (
                  <g key={"l" + e.time}>
                    <circle cx={x0 + toH(e.time) * PX} cy={y(e.cm)} r={3} fill="var(--sea-2)" />
                    <text x={x0 + toH(e.time) * PX} y={y(e.cm) + 15} fontSize={10} textAnchor="middle" fill="var(--sea-2)">
                      干 {e.time}
                    </text>
                  </g>
                ))}
                {/* 3時間ごとの段 */}
                {d.slots.map((s: Slot, k) => {
                  const cx = x0 + (s.hour + 1.5) * PX;
                  const sf = d.slotSafety[k];
                  const windCol = s.windMax == null ? "var(--muted)" : s.windMax >= 10 ? "var(--float)" : s.windMax >= 7 ? "var(--glow)" : "var(--sea-2)";
                  const wd = dirDeg(s.windDir);
                  return (
                    <g key={k}>
                      <line x1={x0 + s.hour * PX} y1={yW} x2={x0 + s.hour * PX} y2={H} stroke="var(--line)" strokeWidth={0.6} />
                      <WeatherIcon w={s.weather} x={cx - 9} y={yW + 5} />
                      <text x={cx} y={yT + 13} fontSize={11} textAnchor="middle" fill="var(--ink)">
                        {s.temp != null ? `${s.temp}°` : ""}
                      </text>
                      <text x={cx} y={yP + 13} fontSize={10.5} textAnchor="middle" fill={s.pop != null && s.pop >= 50 ? "var(--sea-2)" : "var(--muted)"}>
                        {s.pop != null ? `${s.pop}%` : ""}
                      </text>
                      {wd != null && <Arrow deg={wd} x={cx} y={yWind + 11} color={windCol} />}
                      <text x={cx} y={yWind + 29} fontSize={10.5} textAnchor="middle" fill={windCol} fontWeight={s.windMax != null && s.windMax >= 7 ? 700 : 400}>
                        {s.windMax != null ? `${s.windEst ? "≧" : ""}${s.windMax}m` : "－"}
                      </text>
                      {s.mwd != null && <Arrow deg={s.mwd} x={cx} y={yWave + 11} color="var(--tide)" />}
                      <text x={cx} y={yWave + 29} fontSize={10.5} textAnchor="middle" fill="var(--ink)" fontStyle={s.waveEst ? "italic" : "normal"}>
                        {s.swh != null ? `${s.waveEst ? "約" : ""}${s.swh.toFixed(1)}m` : "－"}
                      </text>
                      <circle cx={cx} cy={ySafe + 9} r={5} fill={safeColor(sf.level)}>
                        <title>{`${safeWord(sf.level)}${sf.reasons.length ? "：" + sf.reasons.join("、") : ""}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <path d={area} fill="url(#shio-water)" />
          <polyline points={pts.join(" ")} fill="none" stroke="var(--sea-2)" strokeWidth={2.4} strokeLinejoin="round" />
          {nowX != null && (
            <g>
              <line x1={nowX} y1={top} x2={nowX} y2={H} stroke="var(--float)" strokeWidth={1.5} />
              <rect x={nowX - 14} y={top} width={28} height={13} rx={6} fill="var(--float)" />
              <text x={nowX} y={top + 10} fontSize={9.5} textAnchor="middle" fill="#fff" fontWeight={700}>
                いま
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

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

  // 最初は「いま」の少し前が見えるように
  useEffect(() => {
    if (!scroller.current || nowH === null || !isToday) return;
    scroller.current.scrollLeft = Math.max(0, (nowH - 3) * PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, now === null]);

  if (!days.length) return <p className="small">潮位表のデータを準備中です。</p>;

  const pick = (i: number) => {
    setSel(i);
    scroller.current?.scrollTo({ left: i === 0 && isToday && nowH !== null ? Math.max(0, (nowH - 3) * PX) : i * DAYW, behavior: "smooth" });
  };

  const d = days[Math.min(sel, days.length - 1)];
  const { m, d: dd, w } = md(d.date);

  // いまの潮位
  let nowCard: React.ReactNode = null;
  if (isToday && nowH !== null) {
    const t0 = days[0];
    const h = Math.floor(nowH);
    const a = t0.tide[h];
    const b = t0.tide[h + 1];
    if (a != null && b != null) {
      const level = Math.round(a + (b - a) * (nowH - h));
      const rate = b - a;
      const evs = [
        ...t0.high.map((e) => ({ ...e, kind: "満潮", day: 0 })),
        ...t0.low.map((e) => ({ ...e, kind: "干潮", day: 0 })),
        ...(days[1] ? [...days[1].high.map((e) => ({ ...e, kind: "満潮", day: 1 })), ...days[1].low.map((e) => ({ ...e, kind: "干潮", day: 1 }))] : []),
      ]
        .map((e) => {
          const [hh, mm] = e.time.split(":").map(Number);
          return { ...e, at: e.day * 24 + hh + mm / 60 };
        })
        .filter((e) => e.at > nowH)
        .sort((x, y) => x.at - y.at);
      const next = evs[0];
      const slot = t0.slots[Math.floor(nowH / 3)];
      const sf = t0.slotSafety[Math.floor(nowH / 3)];
      const curIdx = t0.hours[h];
      nowCard = (
        <section className="shio-now" aria-label="いまの海">
          <div className="shio-now-tide">
            <span className="shio-k">いまの潮位</span>
            <strong>
              {level}
              <small>cm</small>
            </strong>
            <span className={rate >= 0 ? "shio-up" : "shio-down"}>
              {rate >= 0 ? "▲ 上げ" : "▼ 下げ"} {Math.abs(rate)}cm/時
            </span>
            {next && (
              <span className="shio-k">
                次の{next.kind} {next.day ? "明日 " : ""}
                {next.time}（あと{hm(next.at - nowH)}）
              </span>
            )}
          </div>
          <div className="shio-now-grid">
            <div>
              <span className="shio-k">天気</span>
              <b>
                {slot?.weather ?? "－"}
                {slot?.temp != null ? ` ${slot.temp}°C` : ""}
              </b>
            </div>
            <div>
              <span className="shio-k">風</span>
              <b>{slot?.windMax != null ? `${slot.windDir ?? ""} ${slot.windMin ?? ""}${slot.windMax ? "〜" + slot.windMax : ""}m/s` : "－"}</b>
            </div>
            <div>
              <span className="shio-k">波</span>
              <b>
                {slot?.swh != null ? `${slot.swh.toFixed(1)}m` : "－"}
                {slot?.mwp != null ? ` / ${Math.round(slot.mwp)}秒` : ""}
                {slot?.mwd != null ? ` ${dirName(slot.mwd)}から` : ""}
              </b>
            </div>
            <div>
              <span className="shio-k">釣りどき指数</span>
              <b>{curIdx?.open ? curIdx.index : "営業時間外"}</b>
            </div>
          </div>
          {sf && (
            <p className="shio-safe" style={{ borderColor: safeColor(sf.level) }}>
              <span className="shio-dot" style={{ background: safeColor(sf.level) }} />
              <b>{safeWord(sf.level)}</b>
              {sf.reasons.length ? `：${sf.reasons.join("、")}` : ""}
            </p>
          )}
        </section>
      );
    }
  }

  return (
    <div className="shio">
      <nav className="shio-days" aria-label="日付を選ぶ">
        {days.slice(0, 8).map((x, i) => {
          const p = md(x.date);
          const daySlot = x.slots[4];
          return (
            <button key={x.date} type="button" className={i === sel ? "on" : ""} onClick={() => pick(i)} aria-pressed={i === sel}>
              <span className="shio-dd">
                {i === 0 && isToday ? "今日" : `${p.m}/${p.d}`}
                <small>({p.w})</small>
              </span>
              <span className="shio-tn">{x.tideName}</span>
              <svg width={22} height={20} aria-hidden>
                <WeatherIcon w={daySlot?.weather ?? null} x={2} y={1} />
              </svg>
              <span className="shio-sc" style={{ background: toneColor(x.grade.tone) }}>
                {x.score ?? "－"}
              </span>
              {x.partial && <span className="shio-k">予報前</span>}
              <span className="shio-dot" style={{ background: safeColor(x.safety.level) }} title={safeWord(x.safety.level)} />
            </button>
          );
        })}
      </nav>

      {nowCard}

      <Timeline days={days} nowX={isToday && nowH !== null ? nowH * PX : null} scroller={scroller} />
      <p className="shio-legend small">
        <span style={{ background: "var(--glow)" }} /> まずめ・指数70以上　<span style={{ background: "var(--tide)" }} /> 釣りどき指数（濃いほど高い）
        <span className="hatch" /> 営業時間外　●の色：<b style={{ color: "var(--tide)" }}>安全</b>・<b style={{ color: "var(--glow)" }}>注意</b>・
        <b style={{ color: "var(--float)" }}>見合わせ</b>　「≧」「約」は府県予報の文や数値モデルからの見積もり、「－」はまだ予報がない時間
      </p>

      <section className="shio-day">
        <header>
          <ScoreRing score={d.score} color={toneColor(d.grade.tone)} />
          <div>
            <p className="shio-k">
              {m}月{dd}日（{w}）・{d.tideName}・月齢{d.moonAge.toFixed(1)}
            </p>
            <h3>
              <span style={{ color: toneColor(d.grade.tone) }}>{d.grade.mark}</span> {d.grade.label}
              {d.partial && <small className="shio-k">（風・波の予報前。潮と時間帯だけの目安）</small>}
            </h3>
            <p className="small">
              {d.grade.tone === "stop"
                ? "風・波・雨などで危ない時間が多いため、この日は釣行をおすすめしません。"
                : d.windows.length
                ? "ねらい目：" + d.windows.map((x) => `${x.from}〜${x.to}時（${x.reasons.join("・") || "潮・時間帯"}）`).join("、")
                : "目立つねらい目はありません"}
            </p>
          </div>
        </header>

        <div className="shio-cards">
          <div className="shio-card">
            <h4>安全の目安</h4>
            <p>
              <span className="shio-dot" style={{ background: safeColor(d.safety.level) }} /> <b>{safeWord(d.safety.level)}</b>
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
            <table className="shio-mini">
              <tbody>
                <tr>
                  <th>満潮</th>
                  <td>{d.high.map((e) => `${e.time}（${e.cm}cm）`).join("　") || "－"}</td>
                </tr>
                <tr>
                  <th>干潮</th>
                  <td>{d.low.map((e) => `${e.time}（${e.cm}cm）`).join("　") || "－"}</td>
                </tr>
                <tr>
                  <th>日の出・入り</th>
                  <td>{d.sun ? `${hm(d.sun.rise)}／${hm(d.sun.set)}` : "－"}</td>
                </tr>
                <tr>
                  <th>月</th>
                  <td className="shio-moon">
                    <MoonIcon age={d.moonAge} size={22} /> 月齢{d.moonAge.toFixed(1)}・{d.tideName}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {d.jma && (
            <div className="shio-card">
              <h4>気象庁の予報</h4>
              <p className="small">
                天気：{d.jma.weather}
                <br />
                風：{d.jma.wind}
                <br />
                波：{d.jma.wave || "－"}
              </p>
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
                    <span className="shio-k">{s.stage}</span>
                    <span className="shio-bar">
                      <span style={{ width: `${s.index}%` }} />
                    </span>
                    <span className="shio-k">{s.index}</span>
                  </div>
                  <p className="small">
                    {tip?.methods.length
                      ? `最近の釣果では ${tip.methods
                          .slice(0, 3)
                          .map((x) => `${x.name}（${x.count}件）`)
                          .join("・")}`
                      : tip?.guide
                        ? `定番は ${tip.guide.method}`
                        : "釣り方の情報はまだありません"}
                    {tip?.guide && (
                      <>
                        {" "}
                        → <Link href={`/species/${tip.guide.slug}/`}>{tip.guide.name}の釣り方</Link>
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
            <h4 className="shio-h4">最近の釣果（施設の公式情報{recentFrom && recentTo ? `、${recentFrom.slice(5).replace("-", "/")}〜${recentTo.slice(5).replace("-", "/")}` : ""}）</h4>
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
