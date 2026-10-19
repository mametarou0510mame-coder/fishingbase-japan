import type { Metadata } from "next";
import Aquarium from "@/app/components/Aquarium";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "マイ水族館（釣った魚を登録して育てる）",
  description: "釣った魚を登録すると、あなただけの水族館で泳ぎ出します。アバター、図鑑、バッジで釣行の記録を楽しく残せます。登録は無料・ログイン不要。",
  alternates: { canonical: "/aquarium/" },
};

export default function AquariumPage() {
  return (
    <article>
      <h1>マイ水族館</h1>
      <p className="lead">釣った魚を登録すると、あなただけの水族館で泳ぎ出します。図鑑を埋めて、バッジを集めましょう。ログインは不要です。</p>
      <Aquarium siteKey={SITE.turnstileSiteKey} />
    </article>
  );
}
