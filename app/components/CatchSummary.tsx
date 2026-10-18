import Link from "next/link";
import { SPECIES } from "@/lib/species";
import type { SpeciesSummary } from "@/lib/catches";

// 集計した魚種を「報告があった日数」の多い順に表で表示する
function speciesLink(name: string) {
  const base = name.replace(/（.*）/, "");
  const sp = SPECIES.find((s) => s.name.replace(/（.*）/, "") === base || s.aliases.includes(base));
  return sp ? <Link href={`/species/${sp.slug}/`}>{name}</Link> : name;
}

function md(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

export default function CatchSummary({
  list,
  spotNames,
  showSpots = false,
}: {
  list: SpeciesSummary[];
  spotNames?: Record<string, string>;
  showSpots?: boolean;
}) {
  if (list.length === 0) return <p className="small">この期間の釣果の報告はありません。</p>;
  const maxDays = Math.max(...list.map((s) => s.days));
  return (
    <table className="catch-table">
      <thead>
        <tr>
          <th>魚種</th>
          <th>報告のあった日</th>
          <th>最大サイズ</th>
          <th>最新</th>
          {showSpots && <th>釣り場</th>}
        </tr>
      </thead>
      <tbody>
        {list.map((s) => (
          <tr key={s.species}>
            <td>{speciesLink(s.species)}</td>
            <td>
              <span className="bar" style={{ width: `${Math.max(8, (s.days / maxDays) * 60)}px` }} aria-hidden="true" />
              {s.days}日
            </td>
            <td>{s.maxSizeCm !== null ? `${s.maxSizeCm}cm` : "―"}</td>
            <td>{md(s.lastDate)}</td>
            {showSpots && <td>{s.spots.map((x) => spotNames?.[x] ?? x).join("、")}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
