"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type FinderSpot = {
  slug: string;
  href: string;
  name: string;
  pref: string;
  area: string;
  type: string;
  basic: boolean;
  free: boolean;
  rentalRod: boolean;
  parking: boolean;
  catches: boolean;
  closeByMonth?: (number | null)[];
};

const FILTERS: { key: string; label: string; test: (s: FinderSpot, month: number) => boolean }[] = [
  { key: "facility", label: "海釣り施設", test: (s) => s.type === "海釣り施設" },
  { key: "ferry", label: "沖堤防（渡船）", test: (s) => s.type === "沖堤防（渡船）" },
  { key: "tsuribori", label: "海上釣り堀", test: (s) => s.type === "海上釣り堀" },
  { key: "rental", label: "レンタル竿あり", test: (s) => s.rentalRod },
  { key: "free", label: "無料", test: (s) => s.free },
  { key: "parking", label: "駐車場あり", test: (s) => s.parking },
  { key: "late", label: "今月は20時まで開いている", test: (s, m) => (s.closeByMonth?.[m - 1] ?? 0) >= 20 },
  { key: "catches", label: "毎日の釣果情報あり", test: (s) => s.catches },
];

// 条件で釣り場を絞り込む（すべての条件を満たす釣り場を表示）
export default function SpotFinder({ spots }: { spots: FinderSpot[] }) {
  const [on, setOn] = useState<string[]>([]);
  const [month, setMonth] = useState(10);
  useEffect(() => setMonth(new Date(Date.now() + 9 * 3600e3).getUTCMonth() + 1), []);
  const active = FILTERS.filter((f) => on.includes(f.key));
  const shown = spots.filter((s) => active.every((f) => f.test(s, month)));
  const toggle = (k: string) => setOn((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
  return (
    <section>
      <div className="chips" role="group" aria-label="条件で絞り込む">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={on.includes(f.key)} className={on.includes(f.key) ? "chip on" : "chip"} onClick={() => toggle(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="small" aria-live="polite">
        {on.length ? `条件に合う釣り場：${shown.length}か所` : `全${spots.length}か所`}
        {on.length > 0 && (
          <>
            {" "}
            <button type="button" className="linklike" onClick={() => setOn([])}>条件をすべて外す</button>
          </>
        )}
      </p>
      <div className="cards">
        {shown.map((s) => (
          <Link key={s.slug} href={s.href} className="card card-link">
            <h3>{s.name}</h3>
            <p>
              {s.pref}・{s.area}・{s.type}
              {s.basic && "（概要のみ）"}
            </p>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p>この条件に合う釣り場はまだありません。条件を減らしてみてください。</p>}
      <p className="small">条件は公式情報で確認できた内容だけで判定しています。確認できていない釣り場は、条件に合っていても表示されないことがあります。</p>
    </section>
  );
}
