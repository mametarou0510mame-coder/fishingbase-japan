import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

// ホーム画面に追加したとき、アプリのように開く設定（PWA）。最初に開くのは潮・海況ページ。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "ツレドキ",
    description: "関西の釣り場ごとの潮・風・波・釣りどき指数と釣果",
    lang: "ja",
    start_url: "/shio/?from=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10345A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "潮・海況", url: "/shio/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "釣り場", url: "/kansai/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "地図", url: "/map/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
