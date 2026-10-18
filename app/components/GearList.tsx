import type { Gear } from "@/lib/species";

// 必要な道具の一覧。アフィリエイトリンクを設定するまでは道具の種類だけを表示する。
// リンクを追加するときは、このコンポーネントに PR 表記を出す（景品表示法のステマ規制）。
export default function GearList({ gear }: { gear: Gear[] }) {
  return (
    <ul className="gear">
      {gear.map((g) => (
        <li key={g.name}>
          <strong>{g.name}</strong>
          <br />
          <span className="small">{g.note}</span>
        </li>
      ))}
    </ul>
  );
}
