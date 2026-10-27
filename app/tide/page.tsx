import type { Metadata } from "next";
import Link from "next/link";
import TidePicker, { type PickItem } from "@/app/components/TidePicker";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REGIONS, TIDE_STATIONS, obsOffset, stationSlug } from "@/lib/tideStations";

export const metadata: Metadata = {
  title: "全国のタイドグラフ（潮見表）・実測潮位",
  description:
    "全国約240地点の潮見表（タイドグラフ）。いまの潮が「上げ何分・下げ何分」か、気象庁の実測潮位との比較、過去1年の潮位まで見られます。",
  alternates: { canonical: "/tide/" },
};

function realtimeCodes(): Set<string> {
  try {
    const j = JSON.parse(readFileSync(join(process.cwd(), "public/data/tide-points.json"), "utf8")) as { points: { code: string }[] };
    return new Set(j.points.map((p) => p.code));
  } catch {
    return new Set();
  }
}

export default function TideIndex() {
  const rt = realtimeCodes();
  const items: PickItem[] = TIDE_STATIONS.map((s) => ({
    code: s.code,
    slug: stationSlug(s.code),
    name: s.name,
    pref: s.pref ?? "",
    lat: s.lat!,
    lon: s.lon!,
    obs: rt.has(s.code) || obsOffset(s) != null,
  }));
  return (
    <article>
      <h1>タイドグラフ（全国の潮見表）</h1>
      <p className="lead">
        地点を選ぶと、いまの潮が「上げ何分・下げ何分」か、満潮・干潮までの時間、気象庁の実測潮位を重ねたタイドグラフが見られます。日付を戻せば過去の潮位も確かめられます。
      </p>
      <TidePicker items={items} regions={REGIONS} />
      <h2>見方</h2>
      <ul className="small">
        <li>
          <b>上げ○分・下げ○分</b>：前の干潮（満潮）から次の満潮（干潮）までを10に分けて、いまどのあたりかを表した釣りの言い方です。「上げ3分」は干潮から3割ほど潮が満ちてきたころです。
        </li>
        <li>
          <b>推算潮位</b>（青い線）は気象庁の潮位表の予測、<b>実測潮位</b>（オレンジの線）は気象庁の観測値です。気圧や風で、実際の潮位は予測より高く・低くなります（潮位偏差）。
        </li>
        <li>点線は「いまのずれがこの先も続いた場合」の見込みで、予報ではありません。</li>
      </ul>
      <p className="small">
        釣り場ごとの潮・風・波と釣りどき指数は<Link href="/shio/">潮・海況</Link>へ。出典：気象庁「潮位表」「潮位観測情報」「潮汐観測資料」をもとに当サイトが加工して表示しています。
      </p>
    </article>
  );
}
