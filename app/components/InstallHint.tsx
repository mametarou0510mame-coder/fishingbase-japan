"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// 「ホーム画面に追加」の案内。アプリとして開いているときは出さない。
// Android の Chrome などでは、ボタンからそのまま追加できる。
export default function InstallHint() {
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setDone(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (standalone || done) return null;
  return (
    <aside className="install-hint" aria-label="ホーム画面に追加">
      <svg width={40} height={40} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#10345A" />
        <path d="M16 7 C19.5 10 20 14 20 16.5 L12 16.5 C12 14 12.5 10 16 7 Z" fill="#E3412B" />
        <path d="M12 16.5 L20 16.5 C20 20 18.5 23 16 24.5 C13.5 23 12 20 12 16.5 Z" fill="#FFFFFF" />
        <path d="M4 18.5 C7 16.8, 9.5 20.4, 12.5 18.5 S 19 16.8, 22 18.5 S 27 20.4, 28 18.5" fill="none" stroke="#5FC3C9" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <div>
        <b>ホーム画面に追加して、アプリのように使えます</b>
        {evt ? (
          <p>
            <button
              type="button"
              onClick={async () => {
                await evt.prompt();
                const r = await evt.userChoice;
                if (r.outcome === "accepted") setDone(true);
                setEvt(null);
              }}
            >
              ホーム画面に追加する
            </button>
          </p>
        ) : ios ? (
          <p>Safari の下にある共有ボタン（□に↑）→「ホーム画面に追加」を押してください。</p>
        ) : (
          <p>
            iPhone は Safari の共有ボタン（□に↑）→「ホーム画面に追加」。Android は Chrome の右上「︙」→「ホーム画面に追加」または「アプリをインストール」。
          </p>
        )}
        <p className="small">アイコンから開くと、潮・海況のページがすぐ出ます。電波が弱い場所でも、前に開いたページは見られます。</p>
      </div>
    </aside>
  );
}
