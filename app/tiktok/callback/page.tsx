import type { Metadata } from "next";
import CallbackCode from "./CallbackCode";

export const metadata: Metadata = {
  title: "TikTok 連携",
  robots: { index: false, follow: false },
};

export default function TikTokCallback() {
  return (
    <article>
      <h1>TikTok 連携</h1>
      <p className="lead">TikTok での許可が終わると、このページに戻ってきます。</p>
      <CallbackCode />
    </article>
  );
}
