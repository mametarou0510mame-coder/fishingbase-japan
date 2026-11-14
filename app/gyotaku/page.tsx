import type { Metadata } from "next";
import Link from "next/link";

// デジタル魚拓の入り口（2026-11-15 オーナー：サイトのバーに魚拓作成の欄を）。作るのはマイ水族館の「釣果を登録」から。
export const metadata: Metadata = {
  title: "デジタル魚拓を無料で作る（写真から・墨の魚拓）",
  description: "釣った魚の写真から、墨の魚拓や写真の魚拓をスマホで無料で作れます。Instagram 投稿・ストーリー・X に合う形で保存・共有できます。写真はこの端末の中だけで処理され、送信されません。",
  alternates: { canonical: "/gyotaku/" },
};

export default function GyotakuPage() {
  return (
    <article>
      <h1>デジタル魚拓を作る</h1>
      <p className="lead">釣った魚の写真から、墨の魚拓や写真の魚拓を無料で作れます。ログインは不要です。</p>
      <img src="/goods/gyotaku-sample.webp" alt="イシダイの墨の魚拓。右に魚の名前と日付の縦書き、左上に全長、右下に落款" style={{ width: "100%", maxWidth: 480, height: "auto", borderRadius: 12, display: "block", margin: "0 auto" }} />
      <div className="link-list" style={{ marginTop: 16 }}>
        <Link className="link-btn" href="/aquarium/?tab=add">魚拓を作る（釣果を登録）</Link>
      </div>
      <h2>作り方</h2>
      <ol>
        <li>魚の名前、全長、釣った日を入れて、魚の写真を選びます。</li>
        <li>写真の魚をタップすると、自動で魚だけを切り抜きます。はみ出しや足りない所は指で直せます。</li>
        <li>魚の頭が右を向くようにそろえて「これで決定」。魚拓は昔ながらの頭が左の形になります。</li>
        <li>「写真の魚拓」か「墨の魚拓」、画像の形（Instagram 投稿・ストーリー・X）を選んで、保存・共有します。</li>
      </ol>
      <h2>きれいに作るコツ</h2>
      <ul>
        <li>魚の全体が入るように、真上から撮ります。</li>
        <li>まな板やシートなど、魚と色の違う平らな所に置くと、切り抜きがきれいになります。</li>
        <li>全長を入れると、目盛りと大きな数字が入ります。</li>
      </ul>
      <p className="small">写真はこの端末の中だけで処理され、どこにも送信されません。登録した魚は<Link href="/aquarium/">マイ水族館</Link>で泳ぎます。</p>
    </article>
  );
}
