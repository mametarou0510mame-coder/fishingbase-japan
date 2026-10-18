"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Options = { spots: { slug: string; name: string }[]; species: string[]; methods: string[]; times: string[] };
type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };

const jst = (offset: number) => new Date(Date.now() + 9 * 3600e3 - offset * 86400e3).toISOString().slice(0, 10);
const dayLabel = (d: string, i: number) => {
  const [y, m, dd] = d.split("-").map(Number);
  const w = "日月火水木金土"[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
  return `${m}/${dd}(${w})${i === 0 ? " 今日" : i === 1 ? " 昨日" : ""}`;
};

export default function PostForm({ siteKey }: { siteKey: string }) {
  const [opt, setOpt] = useState<Options | null>(null);
  const [form, setForm] = useState({ date: jst(0), spot: "", species: "", sizeCm: "", count: "", method: "", timeBand: "" });
  const [token, setToken] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; msg?: string }>({ kind: "idle" });
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    fetch("/data/post-options.json").then((r) => r.json()).then(setOpt).catch(() => setOpt(null));
    const spot = new URLSearchParams(location.search).get("spot");
    if (spot) setForm((f) => ({ ...f, spot }));
  }, []);

  useEffect(() => {
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
  }, [siteKey]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setState({ kind: "error", msg: "「人間であることを確認」が終わるまでお待ちください。" });
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "投稿できませんでした。");
      setState({ kind: "done" });
    } catch (err) {
      setState({ kind: "error", msg: (err as Error).message });
    } finally {
      const w = window as unknown as { turnstile?: TurnstileApi };
      if (widget.current) w.turnstile?.reset(widget.current);
      setToken("");
    }
  };

  if (state.kind === "done") {
    const spot = opt?.spots.find((s) => s.slug === form.spot);
    return (
      <div className="notice">
        <strong>投稿しました。ありがとうございます。</strong>
        <br />
        {spot && <>「{spot.name}」のページの「みんなの釣果」に表示されます。</>}
        <br />
        <button type="button" className="linklike" onClick={() => { setState({ kind: "idle" }); setForm((f) => ({ ...f, species: "", sizeCm: "", count: "" })); }}>
          続けて別の魚を投稿する
        </button>
      </div>
    );
  }

  return (
    <form className="post-form" onSubmit={submit}>
      <label>
        釣った日（必須）
        <select value={form.date} onChange={set("date")} required>
          {Array.from({ length: 8 }, (_, i) => jst(i)).map((d, i) => (
            <option key={d} value={d}>{dayLabel(d, i)}</option>
          ))}
        </select>
      </label>
      <label>
        釣り場（必須）
        <select value={form.spot} onChange={set("spot")} required>
          <option value="">選んでください</option>
          {opt?.spots.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </label>
      <label>
        魚種（必須）
        <select value={form.species} onChange={set("species")} required>
          <option value="">選んでください</option>
          {opt?.species.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <div className="post-row">
        <label>
          いちばん大きいサイズ（cm）
          <input type="number" inputMode="decimal" min={1} max={200} step={0.1} value={form.sizeCm} onChange={set("sizeCm")} />
        </label>
        <label>
          匹数
          <input type="number" inputMode="numeric" min={1} max={999} value={form.count} onChange={set("count")} />
        </label>
      </div>
      <div className="post-row">
        <label>
          釣り方
          <select value={form.method} onChange={set("method")}>
            <option value="">選ばない</option>
            {opt?.methods.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          時間帯
          <select value={form.timeBand} onChange={set("timeBand")}>
            <option value="">選ばない</option>
            {opt?.times.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div ref={box} className="turnstile" />
      {state.kind === "error" && <p className="rank-warn" role="alert">{state.msg}</p>}
      <button type="submit" className="submit" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "投稿しています…" : "投稿する"}
      </button>
      <p className="small">投稿すると、<Link href="/terms/">利用規約</Link>に同意したものとみなします。</p>
    </form>
  );
}
