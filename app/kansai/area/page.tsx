import type { Metadata } from "next";
import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { summarize } from "@/lib/catches";

export const metadata: Metadata = {
  title: "関西のエリア別 釣り情報",
  description: "関西の釣り場をエリアごとにまとめ、最近釣れている魚を施設の公式釣果から集計しています。",
};

export default function AreaIndex() {
  return (
    <>
      <h1>エリア別の釣り情報</h1>
      <p className="lead">エリアごとに、釣り場と最近釣れている魚（施設の公式釣果から集計）をまとめています。</p>
      <div className="cards">
        {AREAS.map((a) => {
          const top = summarize(a.spots).list.slice(0, 3);
          return (
            <Link key={a.slug} href={`/kansai/area/${a.slug}/`} className="card card-link">
              <h3>{a.name}</h3>
              <p>{a.region}（{a.spots.length}か所）</p>
              {top.length > 0 && <p>最近：{top.map((t) => t.species.replace(/（.*）/, "")).join("、")}</p>}
            </Link>
          );
        })}
      </div>
    </>
  );
}
