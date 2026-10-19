"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
const CATEGORIES = ["釣り場を追加してほしい", "釣果の取り込み先", "機能の要望", "情報のまちがい", "その他"];

// 要望の書き込み箱。送られた内容は運営だけが読みます（公開しません）。
export default function RequestForm({ siteKey }: { siteKey: string }) {
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; msg?: string }>({ kind: "idle" });
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    const c = new URLSearchParams(location.search).get("category");
    if (c && CATEGORIES.includes(c)) setCategory(c);
  }, []);

  useEffect(() => {
    if (!siteKey) return;
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

  if (!siteKey) return <p className="notice">要望の受付は準備中です。お急ぎの場合は「お問い合わせ」からご連絡ください。</p>;
  if (state.kind === "done") return <p className="notice">送信しました。ありがとうございます。いただいた要望はサイトづくりの参考にします（個別のお返事はしていません）。</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setState({ kind: "error", msg: "「人間であることを確認」が終わるまでお待ちください。" });
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, body, page: document.referrer || null, turnstileToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "送信できませんでした。");
      setState({ kind: "done" });
    } catch (err) {
      setState({ kind: "error", msg: (err as Error).message });
    }
  };
  return (
    <form className="post-form" onSubmit={submit}>
      <label>
        種類
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="">選んでください</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        内容（5〜1000文字）
        <textarea value={body} onChange={(e) => setBody(e.target.value)} minLength={5} maxLength={1000} rows={6} required placeholder="例：〇〇漁港の情報も載せてほしい／〇〇の釣果も見たい" />
      </label>
      <p className="small">お名前・連絡先・個人が特定できる内容は書かないでください。</p>
      <div ref={box} />
      {state.kind === "error" && (
        <p className="rank-warn" role="alert">
          {state.msg}
        </p>
      )}
      <button type="submit" className="submit" disabled={state.kind === "sending"}>
        送信する
      </button>
    </form>
  );
}
