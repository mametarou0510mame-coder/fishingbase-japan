"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LiveWind from "@/app/components/LiveWind";
import ShioBoard, { type SpeciesTip } from "@/app/components/ShioBoard";
import FavoriteButton from "@/app/components/FavoriteButton";
import InstallHint from "@/app/components/InstallHint";
import type { DayResult } from "@/lib/shio";
import type { WindStation } from "@/lib/liveWind";

type SpotLite = { slug: string; name: string; type: string; area: string; lat: number; lon: number };
type Method = {
  slug: string;
  title: string;
  summary: string;
  why: string;
  youtube: string | null;
  budget: string;
  gear: { name: string; spec: string; rakuten: string; amazon: string | null }[];
};
type SpotData = {
  slug: string;
  name: string;
  type: string;
  area: string;
  pref: string;
  hours: string;
  fee: string;
  restrictions: string[];
  rules: string[];
  station: WindStation | null;
  board: { days: DayResult[]; stationName: string; weatherLabel: string };
  tips: Record<string, SpeciesTip>;
  recent: { species: string; days: number; maxSizeCm: number | null }[];
  recentFrom: string | null;
  recentTo: string | null;
  methods: Method[];
};

// Leaflet（地図）は CDN から読み込む（npm に足さずに済ませる）
const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type L = any;

function loadLeaflet(): Promise<L> {
  const w = window as unknown as { L?: L };
  if (w.L) return Promise.resolve(w.L);
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = LEAFLET_CSS;
    document.head.appendChild(css);
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.onload = () => resolve((window as unknown as { L: L }).L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const TYPE_COLOR: Record<string, string> = {
  海釣り施設: "#E3412B",
  公園の釣り場: "#2E9E5B",
  "沖堤防（渡船）": "#1F6FB2",
  一般の釣り場: "#6B7A8C",
  海上釣り堀: "#B0640E",
};
const NG: Record<string, string> = { "no-chum": "撒き餌禁止", "no-lure": "ルアー禁止", "no-cast": "投げ釣り禁止", "sakura-lifejacket": "桜マークの救命具が必要", "lifejacket-required": "救命具の着用が必要" };

const dist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));

export default function FishingApp() {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L>(null);
  const [spots, setSpots] = useState<SpotLite[]>([]);
  const [sel, setSel] = useState<SpotData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [near, setNear] = useState<(SpotLite & { km: number })[] | null>(null);
  const [mi, setMi] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);

  // サイトのヘッダー・フッターを隠して、アプリの画面にする
  useEffect(() => {
    document.body.classList.add("app-mode");
    return () => document.body.classList.remove("app-mode");
  }, []);

  const open = useCallback(async (slug: string, fly = true) => {
    setLoading(slug);
    setMi(0);
    try {
      const d = (await (await fetch(`/app-data/spot/${slug}.json`)).json()) as SpotData;
      setSel(d);
      setFull(false);
      sheet.current?.scrollTo({ top: 0 });
      const s = spots.find((x) => x.slug === slug);
      if (fly && s && map.current) map.current.flyTo([s.lat - 0.02, s.lon], Math.max(map.current.getZoom(), 12), { duration: 0.6 });
      history.replaceState(null, "", `/app/?spot=${slug}`);
    } finally {
      setLoading(null);
    }
  }, [spots]);

  useEffect(() => {
    fetch("/app-data/spots.json")
      .then((r) => r.json())
      .then((d) => setSpots(d.spots));
  }, []);

  useEffect(() => {
    if (!spots.length || !mapEl.current || map.current) return;
    loadLeaflet().then((Lf) => {
      const m = Lf.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([34.55, 135.25], 9);
      Lf.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
      }).addTo(m);
      Lf.control.zoom({ position: "topright" }).addTo(m);
      for (const s of spots) {
        const mk = Lf.circleMarker([s.lat, s.lon], { radius: 9, color: "#fff", weight: 2, fillColor: TYPE_COLOR[s.type] ?? "#10345A", fillOpacity: 0.95 }).addTo(m);
        mk.bindTooltip(s.name, { direction: "top", offset: [0, -8] });
        mk.on("click", () => open(s.slug, true));
      }
      map.current = m;
      const q = new URLSearchParams(location.search).get("spot");
      if (q) open(q, true);
    });
  }, [spots, open]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const me = { lat: p.coords.latitude, lon: p.coords.longitude };
        const list = spots.map((s) => ({ ...s, km: dist(me, s) })).sort((a, b) => a.km - b.km).slice(0, 5);
        setNear(list);
        setSel(null);
        const Lf = (window as unknown as { L: L }).L;
        if (map.current && Lf) {
          Lf.circleMarker([me.lat, me.lon], { radius: 7, color: "#fff", weight: 3, fillColor: "#2B7BE4", fillOpacity: 1 }).addTo(map.current);
          map.current.flyTo([me.lat - 0.03, me.lon], 11, { duration: 0.6 });
        }
      },
      () => setNear([]),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const m = sel?.methods[mi];
  return (
    <div className="fa">
      <div ref={mapEl} className="fa-map" aria-label="釣り場の地図" />
      <header className="fa-top">
        <Link href="/" className="fa-brand" aria-label="ツレドキ関西のサイトへ">
          ツレドキ<span>関西</span>
        </Link>
        <button type="button" className="fa-btn" onClick={locate}>
          📍 近くの釣り場
        </button>
      </header>
      <div className="fa-legend">
        {Object.entries(TYPE_COLOR).map(([k, c]) => (
          <span key={k}>
            <i style={{ background: c }} />
            {k.replace("（渡船）", "")}
          </span>
        ))}
      </div>

      <section ref={sheet} className={`fa-sheet${sel ? (full ? " full" : " peek") : " mini"}`} aria-live="polite">
        <button type="button" className="fa-handle" aria-label={full ? "小さくする" : "大きくする"} onClick={() => setFull(!full)} />
        {!sel && (
          <div className="fa-pad">
            {loading ? (
              <p>読み込み中…</p>
            ) : near && near.length ? (
              <>
                <h2>近くの釣り場</h2>
                <ul className="fa-near">
                  {near.map((s) => (
                    <li key={s.slug}>
                      <button type="button" onClick={() => open(s.slug)}>
                        <i style={{ background: TYPE_COLOR[s.type] }} />
                        <b>{s.name}</b>
                        <span>
                          {s.type}・約{s.km.toFixed(1)}km
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="fa-hint">地図のピンをタップすると、その釣り場の潮・天気・風・波と、おすすめの釣り方・道具が見られます。</p>
            )}
            <InstallHint />
          </div>
        )}
        {sel && (
          <div className="fa-pad">
            <div className="fa-head">
              <div>
                <span className="fa-type" style={{ background: TYPE_COLOR[sel.type] }}>
                  {sel.type}
                </span>
                <h2>{sel.name}</h2>
                <p className="small">{sel.area}</p>
              </div>
              <button type="button" className="fa-close" aria-label="閉じる" onClick={() => { setSel(null); history.replaceState(null, "", "/app/"); }}>
                ×
              </button>
            </div>
            <p className="fa-actions">
              <FavoriteButton slug={sel.slug} />
              <Link href={`/kansai/${sel.pref}/${sel.slug}/`}>料金・ルール →</Link>
            </p>
            {(sel.restrictions.length > 0 || sel.fee) && (
              <p className="fa-chips">
                {sel.restrictions.map((r) => (
                  <span key={r} className="ng">{NG[r] ?? r}</span>
                ))}
                {sel.fee && <span>{sel.fee.slice(0, 34)}</span>}
              </p>
            )}
            {!full && (
              <button type="button" className="fa-more" onClick={() => setFull(true)}>
                潮・天気・風・波を見る ▲
              </button>
            )}
            {sel.station && <LiveWind station={sel.station} />}
            <h3>潮・天気・風・波（7日間）</h3>
            <ShioBoard spotName={sel.name} spotType={sel.type} days={sel.board.days} tips={sel.tips} recent={sel.recent} recentFrom={sel.recentFrom} recentTo={sel.recentTo} />
            <p className="small">潮位：気象庁 潮位表（{sel.board.stationName}）／天気：気象庁（{sel.board.weatherLabel}）／風・波：ECMWF Open Data（CC BY 4.0）。現地の状況・注意報を優先してください。</p>

            <h3>この釣り場のおすすめの釣り方</h3>
            {sel.methods.length === 0 ? (
              <p className="small">海上釣り堀は、施設のルールと貸し道具に合わせて楽しみましょう。</p>
            ) : (
              <>
                <div className="chips" role="tablist">
                  {sel.methods.map((x, i) => (
                    <button key={x.slug} type="button" role="tab" aria-selected={i === mi} className={`chip${i === mi ? " on" : ""}`} onClick={() => setMi(i)}>
                      {x.title}
                    </button>
                  ))}
                </div>
                {m && (
                  <div className="fa-method">
                    <p className="fa-why">{m.why}</p>
                    <p>{m.summary}</p>
                    {m.youtube && (
                      <a className="fa-video" href={`https://www.youtube.com/watch?v=${m.youtube}`} target="_blank" rel="noopener">
                        <img src={`https://i.ytimg.com/vi/${m.youtube}/hqdefault.jpg`} alt={`${m.title}の動画`} loading="lazy" />
                        <span>▶ 動画で見る</span>
                      </a>
                    )}
                    <p>
                      <Link href={`/guide/${m.slug}/`}>くわしい手順・仕掛けを見る →</Link>
                    </p>
                    <h3>
                      おすすめの道具 <span className="pr">PR</span>
                    </h3>
                    <p className="small">はじめての1セットの目安：{m.budget.replace("目安 ", "")}。楽天市場などの広告リンクです（<Link href="/pr-policy/">選定方針</Link>）。</p>
                    <ul className="fa-gear">
                      {m.gear.map((g) => (
                        <li key={g.name}>
                          <div>
                            <b>{g.name}</b>
                            <span>{g.spec}</span>
                          </div>
                          <div className="fa-shops">
                            <a href={g.rakuten} rel="sponsored nofollow noopener" target="_blank">楽天</a>
                            {g.amazon && (
                              <a href={g.amazon} rel="sponsored nofollow noopener" target="_blank">Amazon</a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {sel.rules.length > 0 && (
              <>
                <h3>ルール・注意</h3>
                <ul className="small">
                  {sel.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
