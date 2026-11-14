"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AVATAR_DEFAULT, type AvatarConf } from "@/app/components/Avatar";
import FishSprite from "@/app/components/FishSprite";
import Gyotaku from "@/app/components/Gyotaku";
import PhotoCutout from "@/app/components/PhotoCutout";
import { blobToDataUrl, deletePhoto, getAllPhotos, putPhoto } from "@/lib/photoStore";

type Catch = { id: string; date: string; spot: string; species: string; sizeCm: number | null; count: number; method: string; memo: string; shared?: boolean; photo?: boolean; released?: boolean /* リリースした（水槽からは出したが記録は残す） */ };
type Store = { v: 1; nickname: string; avatar: AvatarConf; fish: Catch[] };
type Options = { spots: { slug: string; name: string }[]; species: string[]; methods: string[] };
type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };

const KEY = "tsuredoki:aquarium:v1";
const EMPTY: Store = { v: 1, nickname: "", avatar: AVATAR_DEFAULT, fish: [] };
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return s && s.v === 1 ? { ...EMPTY, ...s } : EMPTY;
  } catch {
    return EMPTY;
  }
}
function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 保存できない環境（プライベートモードなど）では、このページを開いている間だけ有効 */
  }
}


// 釣果記録と魚拓（2026-11-15 オーナー：マイ水族館をやめて、魚拓作成・釣果記録のページに）。
// 記録は前と同じ localStorage（tsuredoki:aquarium:v1）と IndexedDB の写真を使うので、前に登録した魚もそのまま残る。
export default function Aquarium({ siteKey }: { siteKey: string }) {
  const [st, setSt] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"list" | "add" | "backup">("add");
  const [opt, setOpt] = useState<Options | null>(null);
  const [pick, setPick] = useState<Catch | null>(null);
  const [gyo, setGyo] = useState<Catch | null>(null);
  const [gyoPhoto, setGyoPhoto] = useState<string | undefined>(undefined);
  const [cut, setCut] = useState<{ id: string; file: File } | null>(null);
  const [photos, setPhotos] = useState<Record<string, { url: string; aspect: number }>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  // ?tab=list などで開くタブを選べる
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "add" || t === "list" || t === "backup") setTab(t);
  }, []);

  // 端末に保存した写真を読み込む
  const loadPhotos = async () => {
    const all = await getAllPhotos();
    const out: Record<string, { url: string; aspect: number }> = {};
    for (const [id, b] of Object.entries(all)) {
      try {
        const bmp = await createImageBitmap(b);
        out[id] = { url: URL.createObjectURL(b), aspect: bmp.height / bmp.width };
        bmp.close();
      } catch {
        /* 読めない写真は使わない */
      }
    }
    setPhotos((old) => {
      Object.values(old).forEach((p) => URL.revokeObjectURL(p.url));
      return out;
    });
  };
  useEffect(() => {
    loadPhotos();
  }, []);
  const openGyotaku = async (c: Catch) => {
    setGyo(c);
    setGyoPhoto(undefined);
    const all = await getAllPhotos();
    if (all[c.id]) setGyoPhoto(await blobToDataUrl(all[c.id]));
  };
  const savePhoto = async (id: string, b: Blob) => {
    await putPhoto(id, b);
    update((s) => ({ ...s, fish: s.fish.map((x) => (x.id === id ? { ...x, photo: true } : x)) }));
    await loadPhotos();
    setCut(null);
    const c = st.fish.find((x) => x.id === id);
    if (c) openGyotaku({ ...c, photo: true });
    setTab("list");
  };

  useEffect(() => {
    const s0 = load();
    setSt(s0);
    if (s0.fish.length && !new URLSearchParams(window.location.search).get("tab")) setTab("list");
    setReady(true);
    fetch("/data/post-options.json").then((r) => r.json()).then(setOpt).catch(() => setOpt(null));
  }, []);
  const update = (f: (s: Store) => Store) =>
    setSt((s) => {
      const n = f(s);
      save(n);
      return n;
    });

  const spotName = (slug: string) => opt?.spots.find((s) => s.slug === slug)?.name ?? (slug === "secret" ? "ひみつの釣り場" : slug || "未記入");
  const species = useMemo(() => [...new Set(st.fish.map((f) => f.species))], [st.fish]);
  const total = st.fish.reduce((n, f) => n + (f.count || 1), 0);
  const biggest = st.fish.reduce<Catch | null>((b, f) => ((f.sizeCm ?? 0) > (b?.sizeCm ?? 0) ? f : b), null);
  const list = useMemo(() => [...st.fish].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [st.fish]);

  return (
    <div className="aq">
      {st.fish.length > 0 && (
        <p className="small">
          これまでの記録：{species.length}種類・{total}匹
          {biggest?.sizeCm ? `・最大 ${biggest.species.replace(/（.*）/, "")} ${biggest.sizeCm}cm` : ""}
        </p>
      )}

      <div className="chips" role="tablist">
        {(
          [
            ["add", "釣果を登録"],
            ["list", `釣果の記録（${st.fish.length}）`],
            ["backup", "バックアップ"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <label className="small">
            魚拓に入れる名前（この端末だけに保存）
            <input value={st.nickname} maxLength={12} placeholder="わたし" onChange={(e) => update((s) => ({ ...s, nickname: e.target.value }))} />
          </label>
          {ready && list.length === 0 && <p>まだ記録がありません。「釣果を登録」から、釣った魚を入れてみましょう。</p>}
          <ul className="catch-list">
            {list.map((f) => (
              <li key={f.id} className="catch-item">
                {photos[f.id] ? <img src={photos[f.id].url} alt="" className="catch-thumb" /> : <span className="catch-thumb"><FishSprite species={f.species} width={88} /></span>}
                <div className="catch-body">
                  <b>{f.species.replace(/（.*）/, "")}</b> {f.sizeCm ? `${f.sizeCm}cm` : ""} {f.count > 1 ? `×${f.count}` : ""}
                  <br />
                  <span className="small">
                    {f.date}・{spotName(f.spot)}
                    {f.method ? `・${f.method}` : ""}
                  </span>
                  {f.memo && <p className="small">{f.memo}</p>}
                  <div className="aq-card-actions">
                    <button className="submit small" onClick={() => openGyotaku(f)}>魚拓にする</button>
                    <button className="linklike small" onClick={() => { setPick(f); fileRef.current?.click(); }}>
                      {photos[f.id] ? "写真を変える" : "写真を取り込む"}
                    </button>
                    <button
                      className="linklike small"
                      onClick={() => {
                        if (confirm("この釣果の記録と写真を削除します。元に戻せません。よろしいですか？")) {
                          update((s) => ({ ...s, fish: s.fish.filter((x) => x.id !== f.id) }));
                          deletePhoto(f.id).then(loadPhotos).catch(() => undefined);
                        }
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              const id = pick?.id;
              if (f && id) { setCut({ id, file: f }); setPick(null); }
              e.target.value = "";
            }}
          />
          {cut && <PhotoCutout file={cut.file} onDone={(b) => savePhoto(cut.id, b)} onCancel={() => setCut(null)} />}
          {gyo && (
            <Gyotaku
              data={{ species: gyo.species, sizeCm: gyo.sizeCm, date: gyo.date, spot: spotName(gyo.spot), angler: st.nickname || "わたし", method: gyo.method, photo: gyoPhoto }}
              onClose={() => setGyo(null)}
            />
          )}
        </>
      )}

      {tab === "add" && (
        <AddForm
          opt={opt}
          siteKey={siteKey}
          onAdd={(c, file) => {
            update((s) => ({ ...s, fish: [...s.fish, c] }));
            setTab("list");
            if (file) setCut({ id: c.id, file });
          }}
        />
      )}

      {tab === "backup" && <Backup st={st} onLoad={(s) => update(() => s)} onPhotos={loadPhotos} />}

      <p className="small">
        釣果の記録と写真は、この端末のブラウザの中だけに保存されます（サーバーには送りません）。機種変更の前は「バックアップ」で保存しておきましょう。
        {siteKey ? "「サイトの釣果に共有する」を選んだ時だけ、日付・釣り場・魚種・サイズ・匹数・釣り方がサイトに載ります（名前・写真・メモは送りません）。" : ""}
        <Link href="/privacy/">プライバシーポリシー</Link>
      </p>
    </div>
  );
}


function AddForm({ opt, siteKey, onAdd }: { opt: Options | null; siteKey: string; onAdd: (c: Catch, photo?: File) => void }) {
  const [photo, setPhoto] = useState<File | undefined>(undefined);
  const [f, setF] = useState({ date: today(), spot: "", species: "", sizeCm: "", count: "1", method: "", memo: "", share: false });
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!f.share || !siteKey) return;
    const w = window as unknown as { turnstile?: TurnstileApi; onTurnstileLoad?: () => void };
    const render = () => {
      if (box.current && w.turnstile && widget.current === null)
        widget.current = w.turnstile.render(box.current, { sitekey: siteKey, callback: (t: string) => setToken(t), "expired-callback": () => setToken("") });
    };
    if (w.turnstile) return render();
    w.onTurnstileLoad = render;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
    s.async = true;
    document.head.appendChild(s);
  }, [f.share, siteKey]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.species) return setMsg("魚種を選んでください。");
    const size = f.sizeCm ? Number(f.sizeCm) : null;
    if (size !== null && !(size > 0 && size <= 200)) return setMsg("サイズは1〜200cmで入力してください。");
    const c: Catch = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      date: f.date,
      spot: f.spot,
      species: f.species,
      sizeCm: size,
      count: Math.max(1, Math.min(999, Number(f.count) || 1)),
      method: f.method,
      memo: f.memo.slice(0, 200),
    };
    if (f.share && siteKey && f.spot && f.spot !== "secret") {
      if (!token) return setMsg("「人間であることを確認」が終わるまでお待ちください。");
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: c.date, spot: c.spot, species: c.species, sizeCm: c.sizeCm, count: c.count, method: c.method || null, turnstileToken: token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "共有できませんでした。");
        c.shared = true;
      } catch (err) {
        setMsg(`${(err as Error).message}（記録には入れました）`);
      }
    }
    onAdd(c, photo);
  };

  if (!opt) return <p>読み込み中…</p>;
  const minDate = new Date(Date.now() + 9 * 3600e3 - 365 * 86400e3).toISOString().slice(0, 10);
  return (
    <form className="post-form" onSubmit={submit}>
      <label>
        釣った日
        <input type="date" value={f.date} min={minDate} max={today()} onChange={set("date")} required />
      </label>
      <label>
        釣り場
        <select value={f.spot} onChange={set("spot")}>
          <option value="">選ばない</option>
          <option value="secret">ひみつの釣り場</option>
          {opt.spots.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        魚種（必須）
        <select value={f.species} onChange={set("species")} required>
          <option value="">選んでください</option>
          {opt.species.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <div className="row2">
        <label>
          サイズ（cm）
          <input type="number" inputMode="decimal" min="1" max="200" step="0.5" value={f.sizeCm} onChange={set("sizeCm")} />
        </label>
        <label>
          匹数
          <input type="number" inputMode="numeric" min="1" max="999" value={f.count} onChange={set("count")} />
        </label>
      </div>
      <label>
        釣り方
        <select value={f.method} onChange={set("method")}>
          <option value="">選ばない</option>
          {opt.methods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label>
        写真（任意・この端末だけに保存）
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0])} />
        <span className="small">魚の写真を入れると、魚だけを切り抜いて、写真の魚拓や墨の魚拓を作れます。</span>
      </label>
      <label>
        メモ（この端末だけに保存）
        <textarea value={f.memo} maxLength={200} rows={2} onChange={set("memo")} placeholder="仕掛け・エサ・天気など" />
      </label>
      {siteKey ? (
        <label className="check">
          <input type="checkbox" checked={f.share} onChange={set("share")} disabled={!f.spot || f.spot === "secret"} />
          サイトの釣果に共有する（名前・写真・メモは送りません）
        </label>
      ) : (
        <p className="small">サイトの釣果への共有は準備中です。</p>
      )}
      {f.share && <div ref={box} />}
      {msg && <p className="rank-warn" role="alert">{msg}</p>}
      <button className="submit" type="submit">
        記録して魚拓を作る
      </button>
    </form>
  );
}

function Backup({ st, onLoad, onPhotos }: { st: Store; onLoad: (s: Store) => void; onPhotos: () => void }) {
  const [msg, setMsg] = useState("");
  const [withPhotos, setWithPhotos] = useState(true);
  const download = async () => {
    // 写真も入れる時は、端末に保存した切り抜き写真を文字（data URL）にしてファイルに含める
    const photos: Record<string, string> = {};
    if (withPhotos) {
      const all = await getAllPhotos();
      for (const [id, b] of Object.entries(all)) if (st.fish.some((f) => f.id === id)) photos[id] = await blobToDataUrl(b);
    }
    const blob = new Blob([JSON.stringify({ ...st, photos }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tsuredoki-aquarium-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg(`保存しました（記録${st.fish.length}件・写真${Object.keys(photos).length}枚）。`);
  };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (s?.v !== 1 || !Array.isArray(s.fish)) throw new Error();
      let n = 0;
      for (const [id, url] of Object.entries((s.photos ?? {}) as Record<string, string>)) {
        if (typeof url !== "string" || !url.startsWith("data:image/")) continue;
        const [head, b64] = url.split(",");
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        await putPhoto(id, new Blob([arr], { type: head.slice(5).split(";")[0] }));
        n++;
      }
      delete s.photos;
      onLoad({ ...EMPTY, ...s });
      onPhotos();
      setMsg(`読み込みました（記録${s.fish.length}件・写真${n}枚）。`);
    } catch {
      setMsg("このファイルは読み込めませんでした。");
    }
  };
  return (
    <div>
      <p>釣果の記録をファイルに保存したり、保存したファイルから戻したりできます。</p>
      <label className="check">
        <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} /> 写真も入れる（ファイルが大きくなります）
      </label>
      <button className="submit" onClick={download}>
        バックアップを保存
      </button>
      <label className="file-btn">
        バックアップから戻す
        <input type="file" accept="application/json" onChange={upload} />
      </label>
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}
