import type { SpotIndex } from "@/lib/fishingIndex";
import { weekLabel } from "@/lib/fishingIndex";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${w})`;
}

const TIDE_LABEL = { 大: "潮大きい", 中: "潮ふつう", 小: "潮小さい" } as const;

// 釣れ指数（今後7日）と、魚種ごとの例年の最盛期
export default function FishingIndex({ data }: { data: SpotIndex }) {
  const first = data.days[0];
  const fromYear = data.coverage.from.slice(0, 4);
  const toYear = data.coverage.to.slice(0, 4);
  return (
    <div>
      <table className="index-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>潮</th>
            <th>釣れ指数の高い魚</th>
          </tr>
        </thead>
        <tbody>
          {data.days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{d.tideClass ? TIDE_LABEL[d.tideClass] : "―"}</td>
              <td>
                {d.top
                  .filter((t) => t.index >= 5)
                  .slice(0, 3)
                  .map((t) => (
                    <span key={t.species} className="idx">
                      {t.species.replace(/（.*）/, "")}
                      <b>{t.index}</b>
                    </span>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {first && (
        <>
          <h3>魚種ごとの例年の最盛期</h3>
          <ul className="small">
            {first.top.map((t) => {
              const sp = data.species[t.species];
              const weeks = sp ? [...new Set(sp.bestWeeks.map(weekLabel))] : [];
              return (
                <li key={t.species}>
                  {t.species}：{t.stage}（例年よいのは {weeks.join("・")}）
                  {sp && sp.tideLift["大"] > 1.08 && "。潮が大きい日に報告が増える傾向"}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="small">
        釣れ指数は、{fromYear}〜{toYear}年に公開された釣果（活動日{data.coverage.activeDays}日分）から、
        「釣果が出た日に、その魚が報告される見込み」を季節・潮の大きさ・直近14日の傾向で計算した目安（0〜100）です。
        釣れることを保証するものではありません。時間帯は上のタイドグラフの「潮がよく動く時間」も参考にしてください。
      </p>
    </div>
  );
}
