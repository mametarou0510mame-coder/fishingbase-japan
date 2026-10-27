"use client";

// 潮位の地点を選ぶ：名前で検索・現在地から近い順・地方ごとの一覧
import Link from "next/link";
import { useMemo, useState } from "react";

export type PickItem = { code: string; slug: string; name: string; pref: string; lat: number; lon: number; obs: boolean };

export default function TidePicker({ items, regions }: { items: PickItem[]; regions: { name: string; prefs: string[] }[] }) {
  const [q, setQ] = useState("");
  const [near, setNear] = useState<{ item: PickItem; km: number }[] | null>(null);
  const [msg, setMsg] = useState("");
  const hits = useMemo(() => {
    const k = q.trim();
    if (!k) return [];
    return items.filter((s) => s.name.includes(k) || s.pref.includes(k) || s.code.toLowerCase() === k.toLowerCase()).slice(0, 30);
  }, [q, items]);

  const locate = () => {
    if (!navigator.geolocation) return setMsg("この端末では現在地を使えません。");
    setMsg("現在地を確認中…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lon } = p.coords;
        const list = items
          .map((item) => ({ item, km: Math.hypot((item.lat - lat) * 111, (item.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180)) }))
          .sort((a, b) => a.km - b.km)
          .slice(0, 6);
        setNear(list);
        setMsg("");
      },
      () => setMsg("現在地を取得できませんでした。名前で探すか、下の一覧から選んでください。"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  const chip = (s: PickItem, extra?: string) => (
    <li key={s.code}>
      <Link href={`/tide/${s.slug}/`}>
        {s.name}
        {extra && <small className="tv-k"> {extra}</small>}
        {s.obs && <span className="tv-obs-dot" title="実測あり" />}
      </Link>
    </li>
  );

  return (
    <div className="tv-pick">
      <input type="search" placeholder="地点名・府県名で探す（例：大阪、函館、沖縄）" value={q} onChange={(e) => setQ(e.target.value)} aria-label="潮位の地点を探す" />
      {hits.length > 0 && <ul>{hits.map((s) => chip(s, s.pref))}</ul>}
      {q && !hits.length && <p className="small">見つかりませんでした。</p>}
      <div>
        <button type="button" className="btn" onClick={locate}>
          現在地から近い地点
        </button>{" "}
        <span className="small">{msg}</span>
        {near && <ul style={{ marginTop: 8 }}>{near.map((n) => chip(n.item, `${n.km < 10 ? n.km.toFixed(1) : Math.round(n.km)}km`))}</ul>}
      </div>
      <p className="small tv-k">
        <span className="tv-obs-dot" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#f08a24" }} /> は実測潮位も見られる地点です。
      </p>
      {regions.map((r) => {
        const list = items.filter((s) => r.prefs.includes(s.pref));
        if (!list.length) return null;
        return (
          <details key={r.name} open={r.name === "近畿"}>
            <summary>
              {r.name} <small className="tv-k">{list.length}地点</small>
            </summary>
            {r.prefs.map((p) => {
              const ps = list.filter((s) => s.pref === p);
              return ps.length ? (
                <div key={p} style={{ margin: "6px 0" }}>
                  <p className="small" style={{ margin: "4px 0" }}>
                    <b>{p}</b>
                  </p>
                  <ul>{ps.map((s) => chip(s))}</ul>
                </div>
              ) : null;
            })}
          </details>
        );
      })}
    </div>
  );
}
