import Link from "next/link";
import ThisMonthLink from "@/app/components/ThisMonthLink";
import { SITE } from "@/lib/site";

export default function Home() {
  return (
    <>
      <section className="hero">
        <span className="badge">公開準備中</span>
        <h1>{SITE.tagline}</h1>
        <p>
          関西の海釣り施設・釣り場について、釣果の傾向、潮汐、料金やルールを1ページにまとめ、
          「今日どこへ行くか」を決められるサイトを準備しています。
        </p>
      </section>

      <ul className="quick-links">
        <li><Link href="/kansai/">関西の釣り場一覧 →</Link></li>
        <li><ThisMonthLink /></li>
        <li><Link href="/species/">魚種から探す →</Link></li>
      </ul>

      <h2>機能</h2>
      <div className="cards">
        <div className="card">
          <h3>釣り場ガイド</h3>
          <p>料金・営業時間・駐車場・禁止事項を、公式情報の確認日つきで掲載します。</p>
        </div>
        <div className="card">
          <h3>今日の潮汐</h3>
          <p>気象庁の潮位表をもとに、釣り場ごとの満潮・干潮と1日の潮位の変化を表示します（天気は準備中）。</p>
        </div>
        <div className="card">
          <h3>釣れ指数</h3>
          <p>公開されている釣果情報を集計し、場所・日付・時間帯ごとの傾向を参考値で示します。</p>
        </div>
      </div>

      <div className="notice">
        当サイトは立入禁止区域や、管理者が釣りを認めていない場所は紹介しません。
        詳しくは<Link href="/disclaimer/">免責事項・安全について</Link>をご覧ください。
      </div>

      <p className="small">
        最新情報は <a href={SITE.instagram} rel="noopener">Instagram（@fishingbase.japan）</a> でお知らせします。
      </p>
    </>
  );
}
