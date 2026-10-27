import type { Metadata } from "next";
import RequestForm from "@/app/components/RequestForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "要望の書き込み箱",
  description: "ツレドキへの要望（載せてほしい釣り場・釣果の取り込み先・ほしい機能・情報のまちがい）をお寄せください。",
  alternates: { canonical: "/request/" },
};

export default function RequestPage() {
  return (
    <article>
      <h1>要望の書き込み箱</h1>
      <p className="lead">
        「この釣り場も載せてほしい」「こんな機能がほしい」「情報がまちがっている」など、気軽にお寄せください。
        送られた内容は運営だけが読み、公開はしません。
      </p>
      <RequestForm siteKey={SITE.turnstileSiteKey} />
    </article>
  );
}
