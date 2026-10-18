import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "お問い合わせ" };

export default function Contact() {
  return (
    <article>
      <h1>お問い合わせ</h1>
      <p className="lead">
        掲載情報の誤り・規制の変更のご連絡、データ削除のご依頼、掲載や取材のご相談などは、以下までご連絡ください。
      </p>
      <table>
        <tbody>
          <tr><th>メール</th><td>{SITE.contactEmail}</td></tr>
          <tr><th>Instagram DM</th><td><a href={SITE.instagram} rel="noopener">{SITE.instagramHandle}</a></td></tr>
        </tbody>
      </table>
      <p className="small">返信まで数日いただく場合があります。釣り場の安全に関わるご連絡は優先して確認します。</p>
    </article>
  );
}
