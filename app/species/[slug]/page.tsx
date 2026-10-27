import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GearList from "@/app/components/GearList";
import { SPECIES, findSpecies, monthRangeLabel } from "@/lib/species";
import { PREF_LABEL, publishedSpots, spotHref } from "@/lib/spots";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return SPECIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const s = findSpecies((await params).slug);
  if (!s) return {};
  return {
    title: `関西の${s.name}釣り：時期・釣り方・道具`,
    description: `関西で${s.name}が釣れる時期の目安（${monthRangeLabel(s.months)}）、釣り方、必要な道具、釣り場をまとめています。`,
  };
}

export default async function SpeciesPage({ params }: { params: Promise<Params> }) {
  const s = findSpecies((await params).slug);
  if (!s) notFound();
  const spots = publishedSpots();

  return (
    <article>
      <p className="small">
        <Link href="/species/">関西で釣れる魚</Link> ＞ {s.name}
      </p>
      <h1>関西の{s.name}釣り</h1>
      <p className="lead">{s.summary}</p>

      <table>
        <tbody>
          <tr><th>釣れる時期（目安）</th><td>{monthRangeLabel(s.months)}</td></tr>
          <tr><th>特によい時期（目安）</th><td>{monthRangeLabel(s.peakMonths)}</td></tr>
          <tr><th>時間帯</th><td>{s.bestTime}</td></tr>
          {s.aliases.length > 0 && <tr><th>別名</th><td>{s.aliases.join("、")}</td></tr>}
        </tbody>
      </table>
      <p className="small">時期は関西の岸釣りでの一般的な目安です。その年の水温や潮によって前後します。</p>

      <h2>釣り方</h2>
      {s.methods.map((m) => (
        <section key={m.name}>
          <h3>{m.name}</h3>
          <p>{m.detail}</p>
        </section>
      ))}

      <h2>必要な道具</h2>
      <GearList gear={s.gear} />

      <h2>注意すること</h2>
      <ul>
        {s.caution.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h2>釣り場を探す</h2>
      <p>
        掲載中の釣り場です。釣りの方法（撒き餌・ルアー・投げ釣り）が禁止されている施設もあるため、各ページのルールを確認してください。
      </p>
      <ul>
        {spots.map((sp) => (
          <li key={sp.slug}>
            <Link href={spotHref(sp)}>{sp.name}</Link>（{PREF_LABEL[sp.pref]}{sp.area}）
          </li>
        ))}
      </ul>
    </article>
  );
}
