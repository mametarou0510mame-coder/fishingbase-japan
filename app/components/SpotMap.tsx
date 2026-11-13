"use client";

import Link from "next/link";
import { useState } from "react";

export type MapView = { w: number; h: number; lon0: number; lat1: number; k: number; c: number; bbox: number[]; path: string };
export type MapSpot = { slug: string; name: string; href: string; type: string; area: string; lat: number; lon: number; rough: boolean; recent: string[]; catches?: { species: string; days: number }[] };

const COLORS: Record<string, string> = {
  海釣り施設: "#d9480f",
  公園の釣り場: "#2b8a3e",
  "沖堤防（渡船）": "#5f3dc4",
  一般の釣り場: "#1971c2",
  海上釣り堀: "#c2255c",
};

function inView(v: MapView, s: MapSpot) {
  return s.lon >= v.bbox[0] && s.lon <= v.bbox[2] && s.lat >= v.bbox[1] && s.lat <= v.bbox[3];
}

// 釣り場の地図（自前の SVG。外部の地図サービスは使わない）
export default function SpotMap({ views, spots }: { views: { key: string; label: string; view: MapView }[]; spots: MapSpot[] }) {
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [fish, setFish] = useState("");
  const v = views[tab].view;
  const inTab = spots.filter((s) => inView(v, s));
  // 魚で絞る：最近30日の公開釣果にその魚がある釣り場だけを濃く表示する（ほかは薄く）
  const daysOf = (s: MapSpot) => (fish ? s.catches?.find((c) => c.species === fish)?.days ?? 0 : 0);
  const fishOptions = Array.from(new Set(inTab.flatMap((s) => (s.catches ?? []).map((c) => c.species))))
    .map((sp) => ({ sp, n: inTab.filter((s) => s.catches?.some((c) => c.species === sp)).length }))
    .sort((a, b) => b.n - a.n || a.sp.localeCompare(b.sp, "ja"));
  const shown = fish ? inTab.filter((s) => daysOf(s) > 0) : inTab;
  const r = tab === 0 ? 7 : 11;
  const cur = spots.find((s) => s.slug === sel);
  const xy = (s: MapSpot) => [(s.lon - v.lon0) * v.c * v.k, (v.lat1 - s.lat) * v.k];
  return (
    <section>
      <div className="tide-tabs" role="tablist" aria-label="地図の範囲">
        {views.map((x, i) => (
          <button key={x.key} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => { setTab(i); setSel(null); setFish(""); }}>
            {x.label}
          </button>
        ))}
      </div>
      {fishOptions.length > 0 && (
        <p className="small">
          <label>
            魚で絞る：{" "}
            <select value={fish} onChange={(e) => { setFish(e.target.value); setSel(null); }}>
              <option value="">すべての釣り場</option>
              {fishOptions.map((o) => (
                <option key={o.sp} value={o.sp}>{o.sp}（{o.n}か所）</option>
              ))}
            </select>
          </label>
          {fish && <> 最近30日の公開釣果に「{fish}」がある{shown.length}か所を表示中。点が大きいほど釣れた日が多い場所です。</>}
        </p>
      )}
      <svg className="spot-map" viewBox={`0 0 ${v.w} ${v.h}`} role="img" aria-label={`${views[tab].label}の釣り場の地図`}>
        <rect width={v.w} height={v.h} className="sea" />
        <path d={v.path} className="land" />
        {inTab.map((s) => {
          const [x, y] = xy(s);
          const d = daysOf(s);
          const dim = !!fish && d === 0;
          const rr = fish && d > 0 ? r * Math.min(1 + d / 6, 2.2) : r;
          return (
            <g key={s.slug} className="pin" opacity={dim ? 0.2 : 1} onClick={() => setSel(s.slug)} role="button" tabIndex={0} aria-label={s.name}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(s.slug)}>
              <circle cx={x} cy={y} r={sel === s.slug ? rr * 1.5 : rr} fill={COLORS[s.type] ?? "#333"} stroke="#fff" strokeWidth={2} />
              <title>{fish && d > 0 ? `${s.name}（${fish}：${d}日）` : s.name}</title>
            </g>
          );
        })}
      </svg>
      <div className="map-legend small">
        {Object.entries(COLORS).map(([k, c]) => (
          <span key={k}><i style={{ background: c }} />{k}</span>
        ))}
      </div>
      {cur ? (
        <div className="card map-card" aria-live="polite">
          <h3><Link href={cur.href}>{cur.name}</Link></h3>
          <p className="small">{cur.type}・{cur.area}{cur.rough ? "（位置はおおよそ）" : ""}</p>
          {cur.recent.length > 0 && <p className="small">最近の釣果：{cur.recent.join("、")}</p>}
          <Link href={cur.href}>潮・天気・料金・ルールを見る →</Link>
        </div>
      ) : (
        <p className="small">点を押すと、釣り場の名前と最近の釣果が出ます。</p>
      )}
      <details>
        <summary>この地図にある釣り場（{shown.length}か所）</summary>
        <ul>
          {shown.map((s) => (
            <li key={s.slug}><Link href={s.href}>{s.name}</Link> <span className="small">{s.area}</span></li>
          ))}
        </ul>
      </details>
    </section>
  );
}
