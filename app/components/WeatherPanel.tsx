import type { WeatherArea } from "@/lib/weather";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${w})`;
}

function fmtReport(iso: string) {
  const d = new Date(iso);
  const j = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${j.getUTCMonth() + 1}月${j.getUTCDate()}日${j.getUTCHours()}時`;
}

// 気象庁の府県予報を表示する（独自予報はしない）
export default function WeatherPanel({ label, data }: { label: string; data: WeatherArea | null }) {
  if (!data || data.days.length === 0) {
    return <p className="small">天気予報は準備中です。</p>;
  }
  return (
    <div>
      <table className="weather-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>天気</th>
            <th>風</th>
            <th>波</th>
          </tr>
        </thead>
        <tbody>
          {data.days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{d.weather}</td>
              <td>{d.wind}</td>
              <td>{d.wave || "―"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.pops.length > 0 && (
        <p className="small">
          降水確率：
          {data.pops
            .filter((p) => p.pop !== null && p.pop !== "")
            .map((p) => {
              const t = new Date(new Date(p.time).getTime() + 9 * 3600 * 1000);
              return `${t.getUTCMonth() + 1}/${t.getUTCDate()} ${t.getUTCHours()}時〜 ${p.pop}%`;
            })
            .join("　")}
        </p>
      )}
      <p className="small">
        {label}の予報（{data.office} {fmtReport(data.reportDatetime)}発表）。出典：
        <a href="https://www.jma.go.jp/bosai/forecast/" rel="noopener">気象庁ホームページ</a>。
        風が強い日や波が高い日は釣行を中止してください。
      </p>
    </div>
  );
}
