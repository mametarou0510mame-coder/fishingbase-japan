import type { Metadata } from "next";
import Link from "next/link";
import PostForm from "@/app/components/PostForm";
import { SITE } from "@/lib/site";

// 投稿機能は後日公開（2026-10-18 オーナー判断）。公開までは検索エンジンに載せない
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "釣果を投稿する",
  description: "関西の海釣り施設・釣り場で釣れた魚を投稿できます。投稿は釣り場ページの「みんなの釣果」と釣果の集計に反映されます。",
};

export default function PostPage() {
  return (
    <article>
      <h1>釣果を投稿する</h1>
      <p className="lead">
        釣れた魚を教えてください。投稿はすぐに釣り場ページの「みんなの釣果」に表示され、翌日までに釣果の集計にも反映されます。
      </p>
      {SITE.turnstileSiteKey ? (
        <PostForm siteKey={SITE.turnstileSiteKey} />
      ) : (
        <div className="notice">投稿フォームは準備中です。もうしばらくお待ちください。</div>
      )}
      <h2>投稿のルール</h2>
      <ul>
        <li>立入禁止の場所や、釣りが禁止されている場所での釣果は投稿しないでください。</li>
        <li>実際に釣った魚だけを、わかる範囲で正確に入力してください。</li>
        <li>名前や写真は受け付けていません。投稿は匿名で表示されます。</li>
        <li>不自然な投稿は、予告なく非表示にすることがあります。</li>
      </ul>
      <p className="small">
        いたずら防止のため、同じ回線からの投稿は1日10件までです。IPアドレスそのものは保存しません。詳しくは
        <Link href="/privacy/">プライバシーポリシー</Link>・<Link href="/terms/">利用規約</Link>をご覧ください。
      </p>
    </article>
  );
}
