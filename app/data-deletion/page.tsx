import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "データ削除のご依頼" };

export default function DataDeletion() {
  return (
    <article>
      <h1>データ削除のご依頼</h1>
      <p className="lead">
        当サイトは、Instagram・Threads の公式APIを通じて、公開されている投稿の情報を釣果の集計に利用しています。
        ご自身の投稿の情報を当サイトから削除・除外したい場合は、以下の手順でご依頼ください。
      </p>

      <h2>ご依頼の方法</h2>
      <ol>
        <li>
          <strong>{SITE.contactEmail}</strong> 宛てにメールをお送りいただくか、
          <Link href="/contact/">お問い合わせ</Link>からご連絡ください。
        </li>
        <li>件名に「データ削除依頼」と記載してください。</li>
        <li>
          本文に、対象のサービス（Instagram または Threads）、アカウント名、
          削除を希望する投稿のURL（すべての投稿の場合は「すべて」）をご記入ください。
        </li>
        <li>
          本人確認のため、当該アカウントからのDM（
          <a href={SITE.instagram} rel="noopener">{SITE.instagramHandle}</a> 宛て）をお願いする場合があります。
        </li>
      </ol>

      <h2>対応内容と期間</h2>
      <ul>
        <li>ご依頼を確認してから30日以内に、当サイトが保存している対象投稿の情報（投稿ID、URL、本文、抽出した情報）を削除します。</li>
        <li>以後、同じアカウントの投稿を集計対象から除外します。</li>
        <li>削除が完了したら、ご連絡いただいた方法で完了をお知らせします。</li>
        <li>個人を識別できない形にすでに集計された統計値（件数など）は、削除の対象外となる場合があります。</li>
      </ul>

      <h2>元の投稿を削除・非公開にした場合</h2>
      <p>
        元の投稿が削除または非公開になったことを当サイトが確認した場合は、ご依頼がなくても当該投稿の情報を削除します。
      </p>

      <p className="small">
        取り扱いの詳細は<Link href="/privacy/">プライバシーポリシー</Link>をご覧ください。
      </p>
    </article>
  );
}
