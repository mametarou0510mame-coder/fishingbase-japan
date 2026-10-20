import type { Metadata } from "next";
import Link from "next/link";
import SpotFinder, { type FinderSpot } from "@/app/components/SpotFinder";
import { areaOfSpot } from "@/lib/areas";
import { sourceOf } from "@/lib/catches";
import { PREF_LABEL, publishedSpots } from "@/lib/spots";

export const metadata: Metadata = {
  title: "関西の釣り場一覧・条件で探す",
  description: "関西の海釣り施設・沖堤防・釣り場を、レンタル竿・無料・駐車場・夜まで営業などの条件で探せます。料金・ルール・潮汐も掲載。",
};

export default function KansaiIndex() {
  const ORDER = ["osaka", "hyogo", "kyoto", "wakayama"];
  const spots: FinderSpot[] = publishedSpots()
    .sort((a, b) => ORDER.indexOf(a.pref) - ORDER.indexOf(b.pref))
    .map((s) => ({
      slug: s.slug,
      href: `/kansai/${s.pref}/${s.slug}/`,
      name: s.name,
      pref: PREF_LABEL[s.pref],
      area: areaOfSpot(s.slug)?.name ?? s.area,
      type: s.type,
      basic: s.level === "basic",
      free: s.fees.some((f) => f.value === "無料"),
      rentalRod: /レンタル竿/.test(s.rentals),
      parking: /あり|台|駐車場/.test(s.parking) && !/^公式サイトでご確認/.test(s.parking),
      catches: !!sourceOf(s.slug),
      closeByMonth: s.closeHourByMonth,
    }));
  return (
    <>
      <h1>関西の釣り場</h1>
      <p className="lead">
        条件のボタンを押すと、当てはまる釣り場だけに絞り込めます。料金・営業時間・ルールは、公式情報で確認した日付とあわせて各ページに掲載しています。
      </p>
      <SpotFinder spots={spots} />
      <p className="small">
        <Link href="/map/">地図から探す</Link>こともできます。掲載する釣り場は順次追加します。<Link href="/kansai/area/">エリア別の釣果まとめ</Link>もご覧ください。
      </p>
    </>
  );
}
