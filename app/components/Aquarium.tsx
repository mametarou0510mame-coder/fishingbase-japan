"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar, { AVATAR_DEFAULT, HAT_COLORS, JACKET_COLORS, SKIN_COLORS, type AvatarConf } from "@/app/components/Avatar";
import FishSprite from "@/app/components/FishSprite";
import Tank from "@/app/components/Tank";
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

const BADGES: { id: string; label: string; test: (f: Catch[]) => boolean }[] = [
  { id: "first", label: "はじめての1匹", test: (f) => f.length >= 1 },
  { id: "five", label: "5種類コンプリート", test: (f) => new Set(f.map((x) => x.species)).size >= 5 },
  { id: "ten", label: "10種類コンプリート", test: (f) => new Set(f.map((x) => x.species)).size >= 10 },
  { id: "big30", label: "30cmオーバー", test: (f) => f.some((x) => (x.sizeCm ?? 0) >= 30) },
  { id: "big50", label: "50cmオーバー", test: (f) => f.some((x) => (x.sizeCm ?? 0) >= 50) },
  { id: "aomono", label: "青物ゲット", test: (f) => f.some((x) => /ハマチ|サゴシ|シオ/.test(x.species)) },
  { id: "ika", label: "イカ・タコ名人", test: (f) => f.some((x) => /イカ|タコ/.test(x.species)) },
  { id: "hundred", label: "通算100匹", test: (f) => f.reduce((n, x) => n + (x.count || 1), 0) >= 100 },
];

export default function Aquarium({ siteKey }: { siteKey: string }) {
  const [st, setSt] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"tank" | "add" | "zukan" | "avatar" | "backup">("tank");
  const [opt, setOpt] = useState<Options | null>(null);
  const [pick, setPick] = useState<Catch | null>(null);
  const [gyo, setGyo] = useState<Catch | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [gyoPhoto, setGyoPhoto] = useState<string | undefined>(undefined);
  const [cut, setCut] = useState<{ id: string; file: File } | null>(null);
  const [photos, setPhotos] = useState<Record<string, { url: string; aspect: number }>>({});
  const fileRef = useRef<HTMLInputElement>(null);

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
    setTab("tank");
  };

  useEffect(() => {
    setSt(load());
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
  const swimmers = useMemo(
    () => [...st.fish].filter((f) => !f.released).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 24).map((f) => ({ id: f.id, species: f.species, sizeCm: f.sizeCm, photo: photos[f.id] })),
    [st.fish, photos],
  );

  return (
    <div className="aq">
      <div className="aq-head">
        <Avatar c={st.avatar} size={84} />
        <div>
          <p className="aq-name">{st.nickname || "あなた"}の水族館</p>
          <p className="small">
            {species.length}種類・{total}匹
            {biggest?.sizeCm ? `・最大 ${biggest.species.replace(/（.*）/, "")} ${biggest.sizeCm}cm` : ""}
          </p>
        </div>
      </div>

      <div className="chips" role="tablist">
        {(
          [
            ["tank", "水族館"],
            ["add", "釣果を登録"],
            ["zukan", "図鑑・バッジ"],
            ["avatar", "アバター"],
            ["backup", "バックアップ"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === "tank" && (
        <>
          <Tank
            fish={swimmers}
            onPick={(id) => id !== releasing && setPick(st.fish.find((x) => x.id === id) ?? null)}
            release={releasing}
            onReleased={(id) => {
              const f = st.fish.find((x) => x.id === id);
              update((s) => ({ ...s, fish: s.fish.map((x) => (x.id === id ? { ...x, released: true } : x)) }));
              setReleasing(null);
              setNotice(`${f?.species.replace(/（.*）/, "") ?? "魚"}を海に返しました。記録は図鑑に残っています。`);
            }}
          >
            <div className="tank-light" />
            {[12, 30, 61, 84].map((x, i) => (
              <svg key={i} className="weed" style={{ left: `${x}%`, animationDelay: `${i * 0.7}s` }} viewBox="0 0 30 100" width="30" height={90 + (i % 2) * 30}>
                <path d="M15 100 Q5 75 15 55 Q25 35 14 15 Q10 6 15 0" stroke={i % 2 ? "#3f9a6b" : "#2f7f58"} strokeWidth="7" fill="none" strokeLinecap="round" />
              </svg>
            ))}
            {[...Array(10)].map((_, i) => (
              <span key={i} className="bubble" style={{ left: `${8 + i * 9}%`, animationDelay: `${(i * 0.9) % 6}s`, animationDuration: `${5 + (i % 4)}s` }} />
            ))}
            <div className="sand" />
            {ready && swimmers.length === 0 && (
              <p className="tank-empty">
                まだ魚がいません。
                <br />
                「釣果を登録」から、釣った魚を入れてみましょう。
              </p>
            )}
          </Tank>
          {pick && (
            <div className="aq-card">
              <FishSprite species={pick.species} width={90} />
              <div>
                <b>{pick.species}</b> {pick.sizeCm ? `${pick.sizeCm}cm` : ""} {pick.count > 1 ? `×${pick.count}` : ""}
                <br />
                <span className="small">
                  {pick.date}・{spotName(pick.spot)}
                  {pick.method ? `・${pick.method}` : ""}
                </span>
                {pick.memo && <p className="small">{pick.memo}</p>}
              </div>
              <div className="aq-card-actions">
                <button className="submit small" onClick={() => { openGyotaku(pick); setPick(null); }}>
                  魚拓にする
                </button>
                <button className="linklike small" onClick={() => fileRef.current?.click()}>
                  {photos[pick.id] ? "写真を変える" : "写真を取り込む"}
                </button>
                <button className="linklike small" onClick={() => { setReleasing(pick.id); setPick(null); setNotice(""); }}>
                  リリースする
                </button>
                <button
                  className="linklike small"
                  onClick={() => {
                    if (confirm("この魚の記録と写真を削除します。元に戻せません。よろしいですか？")) {
                      update((s) => ({ ...s, fish: s.fish.filter((x) => x.id !== pick.id) }));
                      deletePhoto(pick.id).then(loadPhotos).catch(() => undefined);
                      setPick(null);
                    }
                  }}
                >
                  記録を削除
                </button>
                <button className="linklike small" onClick={() => setPick(null)}>
                  閉じる
                </button>
              </div>
            </div>
          )}
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
          {notice && <p className="aq-notice" aria-live="polite">{notice}</p>}
          <p className="small">魚をタップすると、釣った日と場所が見られ、「リリースする」で海に返せます（記録は図鑑に残ります）。「魚拓にする」で全長の目盛りつきのデジタル魚拓を作れます。最近の24匹が泳いでいます。</p>
        </>
      )}

      {tab === "add" && (
        <AddForm
          opt={opt}
          siteKey={siteKey}
          onAdd={(c, file) => {
            update((s) => ({ ...s, fish: [...s.fish, c] }));
            setTab("tank");
            if (file) setCut({ id: c.id, file });
          }}
        />
      )}

      {tab === "zukan" && (
        <>
          {st.fish.some((f) => f.released) && (
            <>
              <h3>リリースした魚</h3>
              <ul className="released">
                {st.fish.filter((f) => f.released).map((f) => (
                  <li key={f.id}>
                    {f.species.replace(/（.*）/, "")} {f.sizeCm ? `${f.sizeCm}cm` : ""} <span className="small">{f.date}・{spotName(f.spot)}</span>{" "}
                    <button className="linklike small" onClick={() => update((s) => ({ ...s, fish: s.fish.map((x) => (x.id === f.id ? { ...x, released: false } : x)) }))}>
                      水槽に戻す
                    </button>{" "}
                    <button className="linklike small" onClick={() => openGyotaku(f).then(() => setTab("tank"))}>
                      魚拓
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>バッジ</h3>
          <ul className="badges">
            {BADGES.map((b) => {
              const ok = b.test(st.fish);
              return (
                <li key={b.id} className={ok ? "on" : ""}>
                  {ok ? "🏅" : "・"} {b.label}
                </li>
              );
            })}
          </ul>
          <h3>図鑑（{species.length}/{opt ? opt.species.length - 1 : "-"}種）</h3>
          <div className="zukan">
            {(opt?.species ?? []).filter((s) => s !== "その他").map((sp) => {
              const mine = st.fish.filter((f) => f.species === sp);
              const max = Math.max(0, ...mine.map((f) => f.sizeCm ?? 0));
              return (
                <div key={sp} className={`zk${mine.length ? " got" : ""}`}>
                  <FishSprite species={sp} width={72} gray={!mine.length} />
                  <span>{mine.length ? sp.replace(/（.*）/, "") : "？？？"}</span>
                  {mine.length > 0 && <span className="small">{max ? `最大${max}cm` : `${mine.length}回`}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "avatar" && (
        <div className="aq-avatar">
          <Avatar c={st.avatar} size={150} />
          <div>
            <label>
              ニックネーム（この端末だけに保存）
              <input value={st.nickname} maxLength={12} onChange={(e) => update((s) => ({ ...s, nickname: e.target.value }))} />
            </label>
            <Swatches label="帽子の色" colors={HAT_COLORS} value={st.avatar.hat} onPick={(v) => update((s) => ({ ...s, avatar: { ...s.avatar, hat: v } }))} />
            <Swatches label="ライフジャケットの色" colors={JACKET_COLORS} value={st.avatar.jacket} onPick={(v) => update((s) => ({ ...s, avatar: { ...s.avatar, jacket: v } }))} />
            <Swatches label="肌の色" colors={SKIN_COLORS} value={st.avatar.skin} onPick={(v) => update((s) => ({ ...s, avatar: { ...s.avatar, skin: v } }))} />
            <div className="chips">
              {(["cap", "bucket", "none"] as const).map((k) => (
                <button key={k} className={`chip${st.avatar.cap === k ? " on" : ""}`} onClick={() => update((s) => ({ ...s, avatar: { ...s.avatar, cap: k } }))}>
                  {k === "cap" ? "キャップ" : k === "bucket" ? "ハット" : "帽子なし"}
                </button>
              ))}
            </div>
            <div className="chips">
              {(["smile", "cool", "wow"] as const).map((k) => (
                <button key={k} className={`chip${st.avatar.face === k ? " on" : ""}`} onClick={() => update((s) => ({ ...s, avatar: { ...s.avatar, face: k } }))}>
                  {k === "smile" ? "にっこり" : k === "cool" ? "サングラス" : "びっくり"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "backup" && <Backup st={st} onLoad={(s) => update(() => s)} />}

      <p className="small">
        水族館の記録は、この端末のブラウザの中だけに保存されます（サーバーには送りません）。機種変更の前は「バックアップ」で保存しておきましょう。
        {siteKey ? "「サイトの釣果に共有する」を選んだ時だけ、日付・釣り場・魚種・サイズ・匹数・釣り方がサイトに載ります（名前・写真・メモは送りません）。" : ""}
        <Link href="/privacy/">プライバシーポリシー</Link>
      </p>
    </div>
  );
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="swatches">
      <span className="small">{label}</span>
      {colors.map((c) => (
        <button key={c} aria-label={c} aria-pressed={c === value} className={c === value ? "on" : ""} style={{ background: c }} onClick={() => onPick(c)} />
      ))}
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
        setMsg(`${(err as Error).message}（水族館には入れました）`);
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
        <span className="small">魚の写真を入れると、魚だけを切り抜いて水族館で泳がせたり、写真の魚拓を作れます。</span>
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
        水族館に入れる
      </button>
    </form>
  );
}

function Backup({ st, onLoad }: { st: Store; onLoad: (s: Store) => void }) {
  const [msg, setMsg] = useState("");
  const download = () => {
    const blob = new Blob([JSON.stringify(st, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tsuredoki-aquarium-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (s?.v !== 1 || !Array.isArray(s.fish)) throw new Error();
      onLoad({ ...EMPTY, ...s });
      setMsg(`読み込みました（${s.fish.length}件）。`);
    } catch {
      setMsg("このファイルは読み込めませんでした。");
    }
  };
  return (
    <div>
      <p>水族館の記録をファイルに保存したり、保存したファイルから戻したりできます。</p>
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
