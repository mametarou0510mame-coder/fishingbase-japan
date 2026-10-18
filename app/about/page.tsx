import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "運営者情報" };

export default function About() {
  return (
    <article>
      <h1>運営者情報</h1>
      <table>
        <tbody>
          <tr><th>サイト名</th><td>{SITE.name}</td></tr>
          <tr><th>運営</th><td>{SITE.name} 運営事務局（個人運営）</td></tr>
          <tr><th>URL</th><td>{SITE.url}</td></tr>
          <tr><th>連絡先</th><td>{SITE.contactEmail}</td></tr>
          <tr><th>SNS</th><td><a href={SITE.instagram} rel="noopener">Instagram {SITE.instagramHandle}</a></td></tr>
          <tr><th>対象地域</th><td>関西（大阪府・兵庫県・和歌山県・京都府ほか）</td></tr>
        </tbody>
      </table>

      <h2>このサイトについて</h2>
      <p>
        釣果の情報は、釣具店のブログ、施設のお知らせ、SNSなどに分かれていて、釣行前に調べるのに時間がかかります。
        {SITE.name} は、関西の釣り場ごとに釣果の傾向・潮汐・ルールをまとめ、行き先を決める手間を減らすことを目指しています。
      </p>

      <h2>情報の扱い方</h2>
      <ul>
        <li>釣り場情報は公式情報を確認し、確認日と出典を記載します。</li>
        <li>SNSの情報は公式APIで取得した公開投稿を集計し、投稿の転載は行いません。</li>
        <li>記事の作成にAIを利用する場合も、公開前に運営者が内容を確認します。</li>
        <li>広告・アフィリエイトを含むページには「PR」と表示します。</li>
      </ul>
    </article>
  );
}
