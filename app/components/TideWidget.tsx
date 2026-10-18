"use client";

import { useEffect, useMemo, useState } from "react";
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

function TideChart({ day, isToday, sun }: { day: TideDay; isToday: boolean; sun: Sun }) {
  const values = day.hourly.filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const min = Math.min(...values) - 10;
  const max = Math.max(...values) + 10;
  const W = 340;
  const H = 150;
  const L = 34;
  const x = (h: number) => L + (h / 23) * (W - L - 8);
  const y = (cm: number) => 12 + (1 - (cm - min) / (max - min)) * (H - 40);
  const points = day.hourly
    .map((v, h) => (v === null ? null : `${x(h).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  const toHour = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    return hh + mm / 60;
  };
  const ranges = movingRanges(day);
  const nowHour = isToday ? (() => {
    const d = new Date(Date.now() + 9 * 3600 * 1000);
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  })() : null;
  const yTicks = [Math.ceil((min + 10) / 50) * 50, Math.floor((max - 10) / 50) * 50].filter(
    (v, i, a) => a.indexOf(v) === i && v >= min && v <= max,
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tide-chart" role="img" aria-label="1日の潮位の変化と潮がよく動く時間帯、日の出・日の入り">
      {sun && (
        <>
          <rect x={x(0)} y={12} width={x(sun.rise) - x(0)} height={H - 40} className="night" />
          <rect x={x(sun.set)} y={12} width={x(23) - x(sun.set)} height={H - 40} className="night" />
          <text x={x(sun.rise)} y={22} textAnchor="middle" className="sunmark">日の出</text>
          <text x={x(sun.set)} y={22} textAnchor="middle" className="sunmark">日の入</text>
        </>
      )}
      {ranges.map((r) => (
        <rect key={r.from} x={x(r.from)} y={12} width={x(r.to) - x(r.from)} height={H - 40} className="moving" />
      ))}
      {[0, 6, 12, 18, 23].map((h) => (
        <g key={h}>
          <line x1={x(h)} x2={x(h)} y1={12} y2={H - 28} className="grid" />
          <text x={x(h)} y={H - 14} textAnchor="middle" className="axis">{h}時</text>
        </g>
      ))}
      {yTicks.map((v) => (
        <text key={v} x={L - 4} y={y(v) + 3} textAnchor="end" className="axis">{v}cm</text>
      ))}
      <polyline points={points} className="line" fill="none" />
      {day.high.map((e) => (
        <g key={`h${e.time}`}>
          <circle cx={x(toHour(e.time))} cy={y(e.cm)} r={3.5} className="hi" />
          <text x={x(toHour(e.time))} y={y(e.cm) - 6} textAnchor="middle" className="mark">満{e.time}</text>
        </g>
      ))}
      {day.low.map((e) => (
        <g key={`l${e.time}`}>
          <circle cx={x(toHour(e.time))} cy={y(e.cm)} r={3.5} className="lo" />
          <text x={x(toHour(e.time))} y={y(e.cm) + 13} textAnchor="middle" className="mark">干{e.time}</text>
        </g>
      ))}
      {nowHour !== null && (
        <line x1={x(nowHour)} x2={x(nowHour)} y1={12} y2={H - 28} className="now" />
      )}
      <rect x={L} y={H - 9} width={10} height={7} className="moving" />
      <text x={L + 14} y={H - 3} className="axis">潮がよく動く時間</text>
      {sun && (
        <>
          <rect x={L + 120} y={H - 9} width={10} height={7} className="night" />
          <text x={L + 134} y={H - 3} className="axis">夜間（日の入〜日の出）</text>
        </>
      )}
    </svg>
  );
}

const DIRS = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
const toJst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
function icon(w: string) {
  if (w.includes("雪")) return "❄";
  if (w.includes("雨")) return "☂";
  if (w.includes("くもり")) return "☁";
  if (w.includes("晴")) return "☀";
  return "・";
}

// 選んだ日の3時間ごとの天気・風・気温・降水確率と、その日の波（気象庁の発表をそのまま表示）
function HourlyWeather({ date, weather }: { date: string; weather: WeatherArea | null }) {
  if (!weather) return null;
  const slots = (weather.hourly ?? []).filter((h) => toJst(h.time).toISOString().slice(0, 10) === date);
  const daily = weather.days.find((d) => d.date === date);
  const popAt = (hour: number) => {
    const p = weather.pops.find((p) => {
      const t = toJst(p.time);
      return t.toISOString().slice(0, 10) === date && t.getUTCHours() <= hour && hour < t.getUTCHours() + 6;
    });
    return p && p.pop !== null && p.pop !== "" ? `${p.pop}%` : "―";
  };
  if (slots.length === 0 && !daily) {
    return <p className="small">この日の天気予報はまだ発表されていません（気象庁の府県予報は3日先まで）。</p>;
  }
  return (
    <div className="hourly">
      {slots.length > 0 ? (
        <div className="hourly-scroll">
          <table className="hourly-table">
            <tbody>
              <tr>
                <th>時刻</th>
                {slots.map((h) => (
                  <td key={h.time}>{toJst(h.time).getUTCHours()}時</td>
                ))}
              </tr>
              <tr>
                <th>天気</th>
                {slots.map((h) => (
                  <td key={h.time} title={h.weather}>
                    <span className="wx" aria-hidden="true">{icon(h.weather)}</span>
                    <span className="wx-text">{h.weather}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th>風</th>
                {slots.map((h) => {
                  const i = DIRS.indexOf(h.windDir);
                  const strong = (h.windMax ?? 0) >= 10;
                  return (
                    <td key={h.time} className={strong ? "warn" : ""}>
                      {i >= 0 && (
                        <span className="arrow" style={{ transform: `rotate(${i * 22.5 + 180}deg)` }} aria-hidden="true">↑</span>
                      )}
                      <span className="wind-dir">{h.windDir || "―"}</span>
                      <span className="wind-speed">
                        {h.windMin !== null && h.windMax !== null ? `${h.windMin}〜${h.windMax}m` : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th>気温</th>
                {slots.map((h) => (
                  <td key={h.time}>{h.temp !== null ? `${h.temp}℃` : "―"}</td>
                ))}
              </tr>
              <tr>
                <th>降水</th>
                {slots.map((h) => (
                  <td key={h.time}>{popAt(toJst(h.time).getUTCHours())}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        daily && (
          <p className="small">
            この日の時間ごとの予報はまだありません。1日の予報：{daily.weather}／{daily.wind}
          </p>
        )
      )}
      {daily && (
        <p className="wave">
          <strong>波</strong> {daily.wave || "―"}
          {slots.length > 0 && <span className="small">（風：{daily.wind}）</span>}
        </p>
      )}
      <p className="small">
        天気・風・気温：気象庁「地域時系列予報」{weather.hourlyPoint ? `（気温は${weather.hourlyPoint}）` : ""}、
        波・降水確率：気象庁「府県天気予報」（{weather.name}）。風速は時刻ごとの予想の幅です。
        風が10m以上の時間帯は赤で示しています。風が強い日や波が高い日は釣行を中止してください。
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
}: {
  code: string;
  stationName: string;
  coords?: { lat: number; lon: number };
  weather?: WeatherArea | null;
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
              <tr>
                <th>干満差</th>
                <td>
                  {tideRangeCm(day)}cm（{rangeClass(day, days ?? [])}）
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
          <TideChart day={day} isToday={offset === 0} sun={sun} />
          <HourlyWeather date={dates[offset]} weather={weather ?? null} />
          <p className="small tide-tip">
            満潮・干潮の前後は潮の流れが止まりやすく、その間の「潮が動いている時間」は魚の活性が上がり、
            一般に最も釣れやすい時間帯といわれます。干満差が大きい日ほど潮がよく動きます。
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
