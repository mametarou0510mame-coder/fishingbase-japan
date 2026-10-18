"use client";

import { useEffect, useMemo, useState } from "react";
import { computeJiai, windLookup, windowLabel, type JiaiResult } from "@/lib/jiai";
import ShareDay from "@/app/components/ShareDay";
import { moonInfo } from "@/lib/moon";
import { hm, sunTimes } from "@/lib/sun";
import type { WeatherArea } from "@/lib/weather";

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

type Sun = { rise: number; set: number } | null;
type Slot = NonNullable<WeatherArea["hourly"]>[number];

const DIRS = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
const toJst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
function icon(w: string) {
  if (w.includes("雪")) return "❄";
  if (w.includes("雨")) return "☂";
  if (w.includes("くもり")) return "☁";
  if (w.includes("晴")) return "☀";
  return "・";
}
function shortWeather(w: string) {
  if (w.includes("雪")) return "雪";
  if (w.includes("雨")) return "雨";
  if (w.includes("くもり")) return "くもり";
  if (w.includes("晴")) return "晴れ";
  return w.slice(0, 3);
}

// 選んだ日の3時間ごとの予報（気象庁の地域時系列予報）。時刻は各コマの始まり
function slotsFor(date: string, weather: WeatherArea | null): Slot[] {
  return (weather?.hourly ?? []).filter((h) => toJst(h.time).toISOString().slice(0, 10) === date);
}

function popFor(date: string, hour: number, weather: WeatherArea | null) {
  const p = weather?.pops.find((p) => {
    const t = toJst(p.time);
    return t.toISOString().slice(0, 10) === date && t.getUTCHours() <= hour && hour < t.getUTCHours() + 6;
  });
  return p && p.pop !== null && p.pop !== "" ? `${p.pop}%` : "";
}

// タイドグラフと、その下に同じ時間軸で3時間ごとの天気・風・気温・降水確率を描く
function TideChart({
  day,
  isToday,
  sun,
  slots,
  date,
  weather,
  jiai,
}: {
  day: TideDay;
  isToday: boolean;
  sun: Sun;
  slots: Slot[];
  date: string;
  weather: WeatherArea | null;
  jiai: JiaiResult;
}) {
  const values = day.hourly.filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const pad = (vMax - vMin) * 0.22 + 6; // 上下に余白を取り、満潮・干潮の文字がはみ出さないようにする
  const min = vMin - pad;
  const max = vMax + pad;
  const W = 340;
  const L = 40; // 左の見出し欄
  const R = 4;
  const TOP = 12;
  const CH = 110; // 潮位グラフの高さ
  const SUNROW = TOP + CH + 11; // 日の出・日の入の段
  const AXIS = TOP + CH + (sun ? 28 : 12); // 時刻の目盛り
  const WX = slots.length ? 92 : 0; // 天気欄の高さ
  const LEGEND = AXIS + WX + 14;
  const H = LEGEND + 6;
  const x = (h: number) => L + (h / 24) * (W - L - R);
  const y = (cm: number) => TOP + (1 - (cm - min) / (max - min)) * CH;
  const points = day.hourly
    .map((v, h) => (v === null ? null : `${x(h).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  const toHour = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    return hh + mm / 60;
  };
  const ranges = movingRanges(day);
  const nowHour = isToday
    ? (() => {
        const d = new Date(Date.now() + 9 * 3600 * 1000);
        return d.getUTCHours() + d.getUTCMinutes() / 60;
      })()
    : null;
  const clampX = (v: number, half: number) => Math.min(Math.max(v, L + half), W - R - half);
  // 満潮・干潮の文字の位置：上下の端からはみ出さないようにし、近い文字どうしは上下にずらす
  const marks = [
    ...day.high.map((e) => ({ key: `h${e.time}`, kind: "hi" as const, text: `満${e.time}`, h: toHour(e.time), cm: e.cm })),
    ...day.low.map((e) => ({ key: `l${e.time}`, kind: "lo" as const, text: `干${e.time}`, h: toHour(e.time), cm: e.cm })),
  ]
    .map((m) => {
      const py = y(m.cm);
      let ty = m.kind === "hi" ? py - 6 : py + 13;
      if (ty < TOP + 9) ty = py + 13;
      if (ty > TOP + CH - 2) ty = py - 6;
      return { ...m, px: x(m.h), py, tx: clampX(x(m.h), 18), ty };
    })
    .sort((a, b) => a.tx - b.tx);
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1];
    const b = marks[i];
    if (Math.abs(a.tx - b.tx) < 40 && Math.abs(a.ty - b.ty) < 10) b.ty = a.ty + (b.ty >= a.ty ? 11 : -11);
  }
  const yTicks = [Math.ceil((min + 10) / 50) * 50, Math.floor((max - 10) / 50) * 50].filter(
    (v, i, a) => a.indexOf(v) === i && v >= min && v <= max,
  );
  const bottom = AXIS + WX; // 区切り線の下端
  const rows = { icon: AXIS + 16, wx: AXIS + 28, arrow: AXIS + 48, wind: AXIS + 64, temp: AXIS + 77, pop: AXIS + 90 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tide-chart" role="img" aria-label="1日の潮位の変化、潮がよく動く時間帯、日の出・日の入り、3時間ごとの天気・風・気温・降水確率">
      {sun && (
        <>
          <rect x={x(0)} y={TOP} width={x(sun.rise) - x(0)} height={bottom - TOP} className="night" />
          <rect x={x(sun.set)} y={TOP} width={x(24) - x(sun.set)} height={bottom - TOP} className="night" />
          <text x={clampX(x(sun.rise), 26)} y={SUNROW} textAnchor="middle" className="sunmark">▲日の出{hm(sun.rise)}</text>
          <text x={clampX(x(sun.set), 26)} y={SUNROW} textAnchor="middle" className="sunmark">▼日の入{hm(sun.set)}</text>
        </>
      )}
      {ranges.map((r) => (
        <rect key={r.from} x={x(r.from)} y={TOP} width={x(r.to) - x(r.from)} height={CH} className="moving" />
      ))}
      {jiai.windows.map((w) => (
        <g key={`j${w.from}`}>
          <rect x={x(w.from)} y={2} width={x(w.to) - x(w.from)} height={7} rx={2} className="jiai" />
        </g>
      ))}
      {/* 3時間ごとの区切り（潮位グラフから天気欄まで通す） */}
      {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
        <line key={h} x1={x(h)} x2={x(h)} y1={TOP} y2={bottom} className={h % 6 === 0 ? "grid" : "grid sub"} />
      ))}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
        <text key={h} x={x(h) + 2} y={AXIS - 2} textAnchor="start" className="axis">{h}時</text>
      ))}
      <line x1={L} x2={x(24)} y1={TOP + CH} y2={TOP + CH} className="grid" />
      {yTicks.map((v) => (
        <text key={v} x={L - 4} y={y(v) + 3} textAnchor="end" className="axis">{v}cm</text>
      ))}
      <polyline points={points} className="line" fill="none" />
      {marks.map((m) => (
        <g key={m.key}>
          <circle cx={m.px} cy={m.py} r={3.5} className={m.kind} />
          <text x={m.tx} y={m.ty} textAnchor="middle" className="mark">{m.text}</text>
        </g>
      ))}
      {nowHour !== null && <line x1={x(nowHour)} x2={x(nowHour)} y1={TOP} y2={bottom} className="now" />}

      {slots.length > 0 && (
        <g className="wx-rows">
          <line x1={L} x2={x(24)} y1={AXIS + 2} y2={AXIS + 2} className="grid" />
          <text x={2} y={rows.wx} className="rowlabel">天気</text>
          <text x={2} y={rows.wind} className="rowlabel">風</text>
          <text x={2} y={rows.temp} className="rowlabel">気温</text>
          <text x={2} y={rows.pop} className="rowlabel">降水</text>
          {slots.map((s) => {
            const h = toJst(s.time).getUTCHours();
            const cx = x(h + 1.5);
            const i = DIRS.indexOf(s.windDir);
            const strong = (s.windMax ?? 0) >= 10;
            return (
              <g key={s.time}>
                <title>{`${h}時〜${h + 3}時：${s.weather}、${s.windDir}の風 ${s.windMin ?? "?"}〜${s.windMax ?? "?"}m、${s.temp ?? "?"}℃`}</title>
                {strong && <rect x={x(h) + 0.5} y={rows.arrow - 11} width={x(h + 3) - x(h) - 1} height={rows.wind + 4 - (rows.arrow - 11)} className="warnbg" />}
                <text x={cx} y={rows.icon} textAnchor="middle" className="wxicon">{icon(s.weather)}</text>
                <text x={cx} y={rows.wx} textAnchor="middle" className="wxtext">{shortWeather(s.weather)}</text>
                {i >= 0 && (
                  <text
                    x={cx}
                    y={rows.arrow}
                    textAnchor="middle"
                    className={strong ? "arrow warn" : "arrow"}
                    transform={`rotate(${i * 22.5 + 180} ${cx} ${rows.arrow - 4})`}
                  >
                    ↑
                  </text>
                )}
                <text x={cx} y={rows.wind} textAnchor="middle" className={strong ? "wxval warn" : "wxval"}>
                  {s.windMin !== null && s.windMax !== null ? `${s.windMin}-${s.windMax}m` : "―"}
                </text>
                <text x={cx} y={rows.temp} textAnchor="middle" className="wxval">{s.temp !== null ? `${s.temp}℃` : "―"}</text>
                <text x={cx} y={rows.pop} textAnchor="middle" className="wxval">{popFor(date, h, weather)}</text>
              </g>
            );
          })}
        </g>
      )}

      <rect x={L} y={LEGEND - 7} width={10} height={7} className="moving" />
      <text x={L + 14} y={LEGEND} className="axis">潮がよく動く時間</text>
      {sun && (
        <>
          <rect x={L + 104} y={LEGEND - 7} width={10} height={7} className="night" />
          <text x={L + 118} y={LEGEND} className="axis">夜間</text>
        </>
      )}
      {slots.length > 0 && (
        <>
          <rect x={L + 148} y={LEGEND - 7} width={10} height={7} className="warnbg" />
          <text x={L + 162} y={LEGEND} className="axis">風10m以上</text>
        </>
      )}
      <rect x={L + 216} y={LEGEND - 7} width={10} height={7} rx={2} className="jiai" />
      <text x={L + 230} y={LEGEND} className="axis">ねらい目</text>
    </svg>
  );
}

// 共有用の文章（LINEなどで送る）
function shareText(p: {
  spotName: string;
  pageUrl?: string;
  date: string;
  day: TideDay;
  sun: Sun;
  jiai: JiaiResult | null;
  slots: Slot[];
  weather: WeatherArea | null;
}) {
  const lines = [`【ツレドキ関西】${p.spotName}`, `${label(p.date)} ${moonInfo(p.date).tideName}`];
  if (p.jiai) {
    lines.push(
      p.jiai.windows.length
        ? `ねらい目：${p.jiai.windows.map((w) => `${w.grade}${windowLabel(w)}${w.reasons.length ? `（${w.reasons.join("・")}）` : ""}`).join("、")}`
        : `ねらい目：${p.jiai.note ?? "なし"}`,
    );
  }
  const hi = p.day.high.map((e) => e.time).join("・") || "なし";
  const lo = p.day.low.map((e) => e.time).join("・") || "なし";
  lines.push(`満潮 ${hi}／干潮 ${lo}`);
  if (p.sun) lines.push(`日の出 ${hm(p.sun.rise)}／日の入 ${hm(p.sun.set)}`);
  const day = p.slots.filter((s) => {
    const h = toJst(s.time).getUTCHours();
    return h >= 3 && h <= 18;
  });
  const top = [...day].sort((a, b) => (b.windMax ?? 0) - (a.windMax ?? 0))[0];
  if (top && top.windMax != null) lines.push(`風：${top.windDir} 最大${top.windMax}m前後（日中）`);
  const daily = p.weather?.days.find((d) => d.date === p.date);
  if (daily) lines.push(`天気：${daily.weather}`, `波：${daily.wave || "―"}`);
  if (p.pageUrl) lines.push(p.pageUrl);
  return lines.join("\n");
}

// グラフの下：その日の波と、時間ごとの予報がない日の1日の予報、出典
function WeatherNotes({ date, weather, hasSlots }: { date: string; weather: WeatherArea | null; hasSlots: boolean }) {
  if (!weather) return null;
  const daily = weather.days.find((d) => d.date === date);
  return (
    <div className="hourly">
      {!daily && !hasSlots && (
        <p className="small">この日の天気予報はまだ発表されていません（気象庁の府県予報は3日先まで）。</p>
      )}
      {daily && !hasSlots && (
        <p className="small">この日の時間ごとの予報はまだありません。1日の予報：{daily.weather}／{daily.wind}</p>
      )}
      {daily && (
        <p className="wave">
          <strong>波</strong> {daily.wave || "―"}
          {hasSlots && <span className="small">（風：{daily.wind}）</span>}
        </p>
      )}
      <p className="small">
        天気・風・気温：気象庁「地域時系列予報」{weather.hourlyPoint ? `（気温は${weather.hourlyPoint}）` : ""}、
        波・降水確率：気象庁「府県天気予報」（{weather.name}）。風は3時間ごとの風速の予想の幅（m/s）、矢印は風が吹いていく向きです。
        風が強い日や波が高い日は釣行を中止してください。
      </p>
    </div>
  );
}

// 1時間ごとの潮位の変化量から、その日に潮がよく動く時間帯を求める。
// 変化量がその日の最大の6割以上の時間をまとめて返す。
export function movingRanges(day: TideDay): { from: number; to: number }[] {
  const rates: number[] = [];
  for (let h = 0; h < 23; h++) {
    const a = day.hourly[h];
    const b = day.hourly[h + 1];
    rates.push(a === null || b === null ? 0 : Math.abs(b - a));
  }
  const maxRate = Math.max(...rates);
  if (maxRate < 3) return []; // 一日を通して潮があまり動かない日
  const out: { from: number; to: number }[] = [];
  rates.forEach((r, h) => {
    if (r >= maxRate * 0.6) {
      const last = out[out.length - 1];
      if (last && last.to === h) last.to = h + 1;
      else out.push({ from: h, to: h + 1 });
    }
  });
  return out;
}

function tideRangeCm(day: TideDay) {
  const v = day.hourly.filter((x): x is number => x !== null);
  return v.length ? Math.max(...v) - Math.min(...v) : 0;
}

// 同じ地点の1年分の干満差と比べて、その日の潮の大きさを3段階で示す
function rangeClass(day: TideDay, all: TideDay[]) {
  const ranges = all.map(tideRangeCm).filter((r) => r > 0).sort((a, b) => a - b);
  if (ranges.length < 30) return "―";
  const r = tideRangeCm(day);
  const q1 = ranges[Math.floor(ranges.length * 0.25)];
  const q3 = ranges[Math.floor(ranges.length * 0.75)];
  if (r >= q3) return "大きい：大潮前後";
  if (r <= q1) return "小さい：小潮前後";
  return "中くらい";
}

export default function TideWidget({
  code,
  stationName,
  coords,
  weather,
  openByMonth,
  closeByMonth,
  spotName,
  pageUrl,
}: {
  spotName?: string;
  pageUrl?: string;
  code: string;
  stationName: string;
  coords?: { lat: number; lon: number };
  weather?: WeatherArea | null;
  openByMonth?: (number | null)[];
  closeByMonth?: (number | null)[];
}) {
  const [days, setDays] = useState<TideDay[] | null>(null);
  const [offset, setOffset] = useState(0);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => jstDate(i)), []);

  useEffect(() => {
    const years = Array.from(new Set(dates.map((d) => Number(d.slice(0, 4)))));
    Promise.all(years.map((y) => loadYear(code, y))).then((r) => setDays(r.flat()));
  }, [code, dates]);

  const day = days?.find((d) => d.date === dates[offset]);
  const sun = coords ? sunTimes(dates[offset], coords.lat, coords.lon) : null;
  const slots = slotsFor(dates[offset], weather ?? null);
  const month = Number(dates[offset].slice(5, 7));
  const jiai = day
    ? computeJiai({
        tide: day.hourly,
        sun,
        open: openByMonth?.[month - 1] ?? null,
        close: closeByMonth?.[month - 1] ?? null,
        windMaxAt: windLookup(weather?.hourly, dates[offset]),
      })
    : null;

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
            <span className="tab-sub">{moonInfo(d).tideName}</span>
          </button>
        ))}
      </div>

      {days === null && <p className="small">潮汐データを読み込み中…</p>}
      {days !== null && !day && <p className="small">この日の潮汐データは準備中です。</p>}
      {day && (
        <>
          <table className="tide-table">
            <tbody>
              {jiai && (
                <tr className="jiai-row">
                  <th>ねらい目</th>
                  <td>
                    {jiai.windows.length > 0
                      ? jiai.windows.map((w) => (
                          <span key={w.from} className="jiai-chip">
                            <b>{w.grade}</b> {windowLabel(w)}
                            {w.reasons.length > 0 && <span className="small">（{w.reasons.join("・")}）</span>}
                          </span>
                        ))
                      : jiai.note}
                  </td>
                </tr>
              )}
              <tr>
                <th>満潮</th>
                <td>{day.high.length ? day.high.map((e) => `${e.time}（${e.cm}cm）`).join("　") : "なし"}</td>
              </tr>
              <tr>
                <th>干潮</th>
                <td>{day.low.length ? day.low.map((e) => `${e.time}（${e.cm}cm）`).join("　") : "なし"}</td>
              </tr>
              <tr>
                <th>干満差</th>
                <td>
                  {tideRangeCm(day)}cm（{rangeClass(day, days ?? [])}）
                </td>
              </tr>
              <tr>
                <th>潮名・月齢</th>
                <td>
                  {moonInfo(dates[offset]).tideName}（月齢{moonInfo(dates[offset]).age.toFixed(1)}）
                </td>
              </tr>
              {sun && (
                <tr>
                  <th>日の出・日の入</th>
                  <td>
                    日の出 {hm(sun.rise)}　日の入 {hm(sun.set)}
                  </td>
                </tr>
              )}
              <tr>
                <th>潮がよく動く時間</th>
                <td>
                  {movingRanges(day).length
                    ? movingRanges(day).map((r) => `${r.from}時〜${r.to}時`).join("、")
                    : "この日は一日を通して潮の動きが小さめです"}
                </td>
              </tr>
            </tbody>
          </table>
          <TideChart
            day={day}
            isToday={offset === 0}
            sun={sun}
            slots={slots}
            date={dates[offset]}
            weather={weather ?? null}
            jiai={jiai!}
          />
          <WeatherNotes date={dates[offset]} weather={weather ?? null} hasSlots={slots.length > 0} />
          {spotName && (
            <ShareDay
              text={shareText({ spotName, pageUrl, date: dates[offset], day, sun, jiai, slots, weather: weather ?? null })}
            />
          )}
          <p className="small tide-tip">
            満潮・干潮の前後は潮の流れが止まりやすく、その間の「潮が動いている時間」は魚の活性が上がり、
            一般に最も釣れやすい時間帯といわれます。干満差が大きい日ほど潮がよく動きます。
            「ねらい目」は、潮の動き・朝夕のまずめ（日の出・日の入の前後）・営業時間・風の予報を組み合わせた当サイト独自の目安です（◎＞○＞△）。
          </p>
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
