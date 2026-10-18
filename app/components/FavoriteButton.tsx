"use client";

import { useEffect, useState } from "react";

const KEY = "tsuredoki:favorites";

// お気に入りはこの端末のブラウザだけに保存する（サーバーには送らない）
export function readFavorites(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

export default function FavoriteButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readFavorites().includes(slug)), [slug]);
  const toggle = () => {
    const list = readFavorites().filter((s) => s !== slug);
    if (!on) list.push(slug);
    writeFavorites(list);
    setOn(!on);
  };
  return (
    <button type="button" className={on ? "fav on" : "fav"} aria-pressed={on} onClick={toggle}>
      {on ? "★ お気に入り登録済み" : "☆ お気に入りに追加"}
    </button>
  );
}
