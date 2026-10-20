import type { Metadata } from "next";
import Link from "next/link";
import SpotMap, { type MapSpot } from "@/app/components/SpotMap";
import { areaOfSpot } from "@/lib/areas";
import { summarize } from "@/lib/catches";
import MAP from "@/lib/kansaiMap.json";
import COORDS from "@/lib/spotCoords.json";
import { publishedSpots } from "@/lib/spots";

export const metadata: Metadata = {
  title: "地図から釣り場を探す（関西）",
  description: "関西の海釣り施設・公園・沖堤防・漁港・海上釣り堀を地図で探せます。点を押すと最近の釣果と、潮・天気・料金のページへ進めます。",
  alternates: { canonical: "/map/" },
};

type Coord = { lat: number; lon: number; rough?: boolean };

export default function MapPage() {
  const coords = COORDS as Record<string, Coord>;
  const spots: MapSpot[] = publishedSpots()
    .filter((s) => coords[s.slug])
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      href: `/kansai/${s.pref}/${s.slug}/`,
      type: s.type,
      area: areaOfSpot(s.slug)?.name ?? s.area,
      lat: coords[s.slug].lat,
      lon: coords[s.slug].lon,
      rough: !!coords[s.slug].rough,
      recent: summarize([s.slug]).list.slice(0, 3).map((x) => x.species.replace(/（.*?）/g, "")),
    }));
  return (
    <>
      <h1>地図から釣り場を探す</h1>
      <p className="lead">関西の釣り場を地図に並べました。点の色は釣り場の種類です。「大阪湾まわり」に切り替えると、神戸・大阪・泉州を大きく見られます。</p>
      <SpotMap
        views={[
          { key: "bay", label: "大阪湾まわり", view: MAP.bay },
          { key: "kansai", label: "関西全体", view: MAP.kansai },
        ]}
        spots={spots}
      />
      <p className="small">
        位置は住所などからのおおよその場所です。実際の入口・釣り座は各釣り場のページと公式情報でご確認ください。立入禁止の場所には入らないでください。{MAP.credit}。
      </p>
      <p><Link href="/kansai/">条件で釣り場を探す →</Link></p>
    </>
  );
}
