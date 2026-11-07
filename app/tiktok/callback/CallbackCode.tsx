"use client";
import { useEffect, useState } from "react";

export default function CallbackCode() {
  const [p, setP] = useState<{ code?: string; error?: string; desc?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setP({
      code: q.get("code") ?? undefined,
      error: q.get("error") ?? undefined,
      desc: q.get("error_description") ?? undefined,
    });
  }, []);
  if (!p) return null;
  if (p.error) return <p>連携できませんでした：{p.error} {p.desc}</p>;
  if (!p.code) return <p>このページは TikTok の連携専用です。</p>;
  return (
    <>
      <p>下のコードをコピーして、GitHub の「TikTok 連携」の実行画面に貼ってください。コードは数分で使えなくなります。</p>
      <textarea readOnly value={p.code} rows={4} style={{ width: "100%" }} onFocus={(e) => e.currentTarget.select()} />
      <p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(p.code!).then(() => setCopied(true), () => {});
          }}
        >
          {copied ? "コピーしました" : "コードをコピー"}
        </button>
      </p>
    </>
  );
}
