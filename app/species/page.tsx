import type { Metadata } from "next";
import Link from "next/link";
import { SPECIES, monthRangeLabel } from "@/lib/species";

export const metadata: Metadata = {
  title: "関西で釣れる魚",
  description: "関西の海釣り施設で狙える魚の時期、釣り方、必要な道具をまとめています。",
};

export default function SpeciesIndex() {
  return (
    <>
      <h1>関西で釣れる魚</h1>
      <p className="lead">関西の海釣り施設や岸から狙える代表的な魚の、時期・釣り方・必要な道具をまとめています。</p>
      <div className="cards">
        {SPECIES.map((s) => (
          <Link key={s.slug} href={`/species/${s.slug}/`} className="card card-link">
            <h3>{s.name}</h3>
            <p>時期の目安：{monthRangeLabel(s.months)}</p>
          </Link>
        ))}
      </div>
      <p className="small">
        <Link href="/kansai/month/">月別のまとめを見る</Link>
      </p>
    </>
  );
}
