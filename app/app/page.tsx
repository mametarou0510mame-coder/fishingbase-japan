import type { Metadata, Viewport } from "next";
import FishingApp from "./FishingApp";
import InstallHint from "@/app/components/InstallHint";

export const metadata: Metadata = {
  title: "ツレドキ関西アプリ｜地図で選ぶ釣り場の潮・天気・風・波とおすすめの釣り方",
  description: "地図から関西の釣り場を選ぶと、潮汐・天気・風・波（7日間）、いまの風、その釣り場でおすすめの釣り方と道具が見られます。ホーム画面に追加してアプリとして使えます。",
  alternates: { canonical: "/app/" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#10345A" };

export default function AppPage() {
  return (
    <>
      <FishingApp />
      <div className="fa-install">
        <InstallHint />
      </div>
    </>
  );
}
