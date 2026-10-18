import Link from "next/link";
import { rakutenSearchUrl } from "@/lib/affiliate";
import { summarize } from "@/lib/catches";
import { GEAR_INFO, SAFETY_NOTE, allowed } from "@/lib/gear";
import { SPECIES, speciesFromCatchName, speciesInMonth, type Species } from "@/lib/species";
import type { Spot } from "@/lib/spots";

const BLOCK_LABEL = { chum: "撒き餌（コマセ）禁止", lure: "ルアー釣り禁止", cast: "投げ釣り禁止" } as const;

// その釣り場で今狙いやすい魚（最近の釣果 → 今月が旬の魚の順）を最大3種
function targetSpecies(spot: Spot): Species[] {
  const picked: Species[] = [];
  const add = (s: Species) => {
    if (picked.length < 3 && !picked.some((p) => p.slug === s.slug)) picked.push(s);
  };
  for (const row of summarize([spot.slug]).list) speciesFromCatchName(row.species).forEach(add);
  const month = Number(new Date(Date.now() + 9 * 3600e3).toISOString().slice(5, 7));
  const seasonal = speciesInMonth(month).sort(
    (a, b) => Number(b.peakMonths.includes(month)) - Number(a.peakMonths.includes(month)),
  );
  seasonal.forEach(add);
  return picked.length ? picked : SPECIES.slice(0, 2);
}

// 「この釣り場で使える道具」。釣り場の禁止事項に合わない道具は広告リンクを出さない。
export default function SpotGear({ spot }: { spot: Spot }) {
  const r = spot.restrictions;
  const species = targetSpecies(spot);
  const lifeNote =
    (r?.includes("sakura-lifejacket") && SAFETY_NOTE["sakura-lifejacket"]) ||
    (r?.includes("lifejacket-required") && SAFETY_NOTE["lifejacket-required"]) ||
    "どの釣り場でも着用をおすすめします。国の安全基準を満たした「桜マーク」付きが安心です。";

  return (
    <>
      <h2>この釣り場で使える道具</h2>
      <div className="aff">
        <p className="aff-label">
          <span className="pr">PR</span> 楽天市場の広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）。
          この釣り場のルールで使えない道具にはリンクを付けていません。
          {spot.level === "basic" && "ただし、この釣り場は詳しいルールを確認できていないため、撒き餌などが使えるかは施設でご確認ください。"}
        </p>
        <div className="aff-item">
          <p className="aff-name">ライフジャケット（桜マーク付き）</p>
          <p className="small">{lifeNote}</p>
          <p className="aff-links">
            <a href={rakutenSearchUrl(GEAR_INFO.lifejacket.keyword)} rel="sponsored nofollow noopener" target="_blank">
              楽天市場で探す
            </a>
          </p>
        </div>
        {species.map((s) => (
          <div key={s.slug} className="aff-item">
            <p className="aff-name">
              <Link href={`/species/${s.slug}/`}>{s.name}</Link>を狙うなら
            </p>
            <ul className="gear-links">
              {s.gear.map((g) => {
                const info = g.key ? GEAR_INFO[g.key] : undefined;
                const ok = allowed(info?.tags, r);
                const blocked = info?.tags?.find((t) => !allowed([t], r));
                return (
                  <li key={g.name}>
                    <span>{g.name}</span>
                    {!ok && blocked ? (
                      <span className="small">（この釣り場は{BLOCK_LABEL[blocked]}のため使えません）</span>
                    ) : info ? (
                      <a href={rakutenSearchUrl(info.keyword)} rel="sponsored nofollow noopener" target="_blank">
                        楽天市場で探す
                      </a>
                    ) : (
                      <span className="small">（{g.note}）</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
