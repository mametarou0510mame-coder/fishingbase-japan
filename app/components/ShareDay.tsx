"use client";

import { useState } from "react";

// 選んだ日の釣行情報を文章にして、LINEや他のアプリで送る
export default function ShareDay({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* 共有をやめた場合などは何もしない */
    }
  };
  return (
    <div className="share">
      <a className="share-line" href={`https://line.me/R/share?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener">
        LINEで送る
      </a>
      <button type="button" className="fav" onClick={share}>
        {copied ? "コピーしました" : "ほかのアプリで送る・コピー"}
      </button>
    </div>
  );
}
