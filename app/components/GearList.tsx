import Link from "next/link";
import ShopLinks from "@/app/components/ShopLinks";
import { AFF_SHOPS } from "@/lib/affiliate";
import { GEAR_INFO } from "@/lib/gear";
import type { Gear } from "@/lib/species";

// 必要な道具の一覧。広告リンクを含むため PR 表記を出す（景品表示法のステマ規制）。
export default function GearList({ gear }: { gear: Gear[] }) {
  const hasLinks = gear.some((g) => g.key);
  return (
    <>
      {hasLinks && (
        <p className="aff-label">
          <span className="pr">PR</span> {AFF_SHOPS}の広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）。
          撒き餌やルアーなど、釣り場によっては使えない道具があります。各釣り場のルールをご確認ください。
        </p>
      )}
      <ul className="gear">
        {gear.map((g) => (
          <li key={g.name}>
            <strong>{g.name}</strong>
            {g.key && (
              <>
                {" "}
                <ShopLinks keyword={GEAR_INFO[g.key].keyword} className="small" />
              </>
            )}
            <br />
            <span className="small">{g.note}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
