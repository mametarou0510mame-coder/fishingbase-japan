import { methodsBySpecies, sameSeasonHistory } from "@/lib/patterns";

function jstToday() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

// 「釣れ方のヒント」：最近の魚種×釣り方と、去年・おととしの今ごろ
export default function CatchPatterns({ spotSlug }: { spotSlug: string }) {
  const methods = methodsBySpecies(spotSlug);
  const today = jstToday();
  const history = sameSeasonHistory(spotSlug, today);
  if (methods.list.length === 0 && history.length === 0) return null;
  const [, m, d] = today.split("-").map(Number);
  return (
    <>
      {methods.list.length > 0 && (
        <>
          <h3>最近釣れている釣り方</h3>
          <table className="catch-table">
            <thead>
              <tr>
                <th>魚種</th>
                <th>釣り方（報告数）</th>
              </tr>
            </thead>
            <tbody>
              {methods.list.slice(0, 6).map((s) => (
                <tr key={s.species}>
                  <td>{s.species}</td>
                  <td>{s.methods.map((x) => `${x.name}（${x.count}）`).join("、")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">施設が発表した釣果のうち、釣り方の記載があるもの（{methods.reports}件）を集計しています。</p>
        </>
      )}
      {history.length > 0 && (
        <>
          <h3>
            過去の今ごろ（{m}月{d}日の前後3日）
          </h3>
          <ul className="history-list">
            {history.map((h) => (
              <li key={h.year}>
                <b>{h.year}年</b>
                {h.top.length > 0 ? h.top.map((t) => t.species).join("、") : "魚種の記録なし"}
                <span className="small">（釣果のあった日 {h.activeDays}/7日）</span>
              </li>
            ))}
          </ul>
          <p className="small">施設が過去に発表した釣果から、その期間に報告の多かった魚の順に並べています。</p>
        </>
      )}
    </>
  );
}
