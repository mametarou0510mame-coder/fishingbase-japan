"use client";

import { useEffect } from "react";

// ホーム画面に追加して使うときのサービスワーカーを登録する
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* 登録できない環境では何もしない */
    });
  }, []);
  return null;
}
