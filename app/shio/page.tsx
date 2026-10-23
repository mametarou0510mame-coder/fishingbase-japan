import type { Metadata } from "next";
import Link from "next/link";
import InstallHint from "@/app/components/InstallHint";
import ShioList, { type ListArea } from "@/app/components/ShioList";
import { AREAS } from "@/lib/areas";
import { buildBoard } from "@/lib/shioData";
import { publishedSpots } from "@/lib/spots";

export const metadata: Metadata = {
  title: "関西の潮見表・風・波と釣りどき指数",
  description:
    "大阪・兵庫・京都・和歌山の釣り場ごとに、タイドグラフ（潮汐）、天気・風・波の予報、釣りどき指数と安全の目安を7日先まで一覧できます。",
  alternates: { canonical: "/shio/" },
};

export default function ShioIndex() {
  const spots = publishedSpots();
  const areas: ListArea[] = AREAS.map((a) => ({
    name: a.name,
    spots: a.spots
      .map((slug) => spots.find((s) => s.slug === slug))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => {
        const b = buildBoard(s);
        return {
          slug: s.slug,
          name: s.name,
          type: s.type,
          days: b.days.map((d) => {
            const waves = d.slots.map((x) => x.swh).filter((v): v is number => v != null);
            const winds = d.slots.map((x) => x.windMax).filter((v): v is number => v != null);
            return {
              date: d.date,
              score: d.score,
              tone: d.grade.tone,
              mark: d.grade.mark,
              safety: d.safety.level,
              tideName: d.tideName,
              weather: d.slots[4]?.weather ?? null,
              swh: waves.length ? Math.max(...waves) : null,
              wind: winds.length ? Math.max(...winds) : null,
            };
          }),
        };
      }),
  })).filter((a) => a.spots.length);

  return (
    <article>
      <h1>潮・海況（関西の釣り場）</h1>
      <p className="lead">
        釣り場ごとの潮位・天気・風・波を、7日先まで一枚で。当サイト独自の「釣りどき指数」と「安全の目安」で、行く日と時間を決めやすくしています。
      </p>
      <p className="small">
        数字は釣りどき指数（0〜100）。色は
        <b style={{ color: "var(--glow)" }}>◎釣りどき</b>・<b style={{ color: "var(--tide)" }}>○まずまず</b>・
        <b style={{ color: "var(--sea-2)" }}>△いまひとつ</b>・<b style={{ color: "var(--float)" }}>×見合わせ推奨</b>。数字の下の線は安全の目安です。
        釣り場名を押すと、時間ごとのタイドグラフ・風・波が見られます。<Link href="/map/">地図から探す</Link>
      </p>
      <InstallHint />
      <ShioList areas={areas} />
      <p className="small">
        出典：潮位・天気は気象庁、波は ECMWF Open Data（CC BY 4.0）。指数と安全の目安は当サイト独自の目安で、釣果や安全を保証するものではありません。
      </p>
    </article>
  );
}
