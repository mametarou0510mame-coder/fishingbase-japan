import type { Metadata } from "next";
import Aquarium from "@/app/components/Aquarium";
import { SITE } from "@/lib/site";

// 魚拓作成・釣果記録（2026-11-15 オーナー：マイ水族館をやめて、このページに）。前の /aquarium/ はここへ移る。
export const metadata: Metadata = {
  title: "デジタル魚拓・釣果記録（写真から無料で作れる）",
  description: "釣った魚の写真から、墨の魚拓や写真の魚拓をスマホで無料で作れます。釣果の記録も残せて、Instagram 投稿・ストーリー・X に合う形で保存・共有できます。写真は端末の中だけで処理され、送信されません。ログイン不要。",
  alternates: { canonical: "/gyotaku/" },
};

export default function GyotakuPage() {
  return (
    <article>
      <h1>デジタル魚拓・釣果記録</h1>
      <p className="lead">釣った魚を記録して、写真から墨の魚拓や写真の魚拓を作れます。無料・ログイン不要です。</p>
      <Aquarium siteKey={SITE.turnstileSiteKey} />

      <h2>作り方</h2>
      <ol>
        <li>「釣果を登録」で、魚の名前、全長、釣った日を入れて、魚の写真を選びます。</li>
        <li>写真の魚をタップすると、自動で魚だけを切り抜きます。はみ出しや足りない所は指で直せます。</li>
        <li>魚拓は昔ながらの「頭が左」。確認の画面で頭が左になっていなければ「左右を反転」を押して、「これで決定」。</li>
        <li>「写真の魚拓」か「墨の魚拓」、画像の形（Instagram 投稿・ストーリー・X）を選んで、保存・共有します。</li>
      </ol>
      <img src="/goods/gyotaku-sample.webp" alt="イシダイの墨の魚拓の見本。右に魚の名前と日付の縦書き、左上に全長、右下に落款" style={{ width: "100%", maxWidth: 360, height: "auto", borderRadius: 12, display: "block", margin: "0 auto" }} loading="lazy" />
      <h2>きれいに作るコツ</h2>
      <ul>
        <li>魚の全体が入るように、真上から撮ります。</li>
        <li>まな板やシートなど、魚と色の違う平らな所に置くと、切り抜きがきれいになります。</li>
        <li>全長を入れると、目盛りと大きな数字が入ります。</li>
      </ul>
    </article>
  );
}
