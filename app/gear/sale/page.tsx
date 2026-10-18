import type { Metadata } from "next";
import Link from "next/link";
import { rakutenSearchUrl } from "@/lib/affiliate";
import { loadDeals } from "@/lib/deals";

export const metadata: Metadata = {
  title: "釣り道具のセール・お得情報",
  description: "楽天市場でポイントアップ中の釣り道具（サビキセット・ライフジャケット・クーラーボックスなど）を毎日更新で紹介します。",
};

const yen = (n: number | null) => (n === null ? "" : `${n.toLocaleString("ja-JP")}円`);
const until = (s: string) => {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])}/${Number(m[3])}まで` : "";
};

export default function SalePage() {
  const deals = loadDeals();
  const has = deals && deals.categories.some((c) => c.items.length > 0);
  return (
    <article>
      <h1>釣り道具のセール・お得情報</h1>
      <p className="lead">
        楽天市場で、ポイントが2倍以上になっている釣り道具の中から、レビューの多い商品を毎朝集めています。
      </p>
      <p className="aff-label">
        <span className="pr">PR</span> 楽天市場の広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）。
        価格・ポイント・在庫は変わるため、購入前に販売ページでご確認ください。
      </p>

      {has ? (
        <>
          <p className="small">更新日：{deals!.updatedOn}</p>
          {deals!.categories.map((c) =>
            c.items.length ? (
              <section key={c.key}>
                <h2>{c.label}</h2>
                {c.kind === "popular" && (
                  <p className="small">今日はポイントアップ中の商品がないため、レビューの多い人気商品を表示しています。</p>
                )}
                <ul className="deal-grid">
                  {c.items.map((i) => (
                    <li key={i.url} className="deal">
                      <a href={i.url} rel="sponsored nofollow noopener" target="_blank">
                        {i.image && <img src={i.image} alt="" loading="lazy" width={120} height={120} />}
                        <span className="deal-name">{i.name}</span>
                      </a>
                      <span className="deal-price">{yen(i.price)}</span>
                      {i.pointRate > 1 && (
                        <span className="deal-point">
                          ポイント{i.pointRate}倍{i.pointEnd && `（${until(i.pointEnd)}）`}
                        </span>
                      )}
                      {i.reviewCount > 0 && (
                        <span className="small">
                          ★{i.review}（{i.reviewCount.toLocaleString("ja-JP")}件）
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
          <p className="small">
            <a href="https://developers.rakuten.com/" rel="noopener">Supported by Rakuten Developers</a>
          </p>
        </>
      ) : (
        <>
          <div className="notice">
            毎日更新のお得情報は準備中です。それまでは、楽天市場の検索結果から直接お探しください。
          </div>
          <ul className="quick-links">
            {[
              ["サビキ釣りセット", "サビキ セット 竿 リール"],
              ["ライフジャケット（桜マーク）", "ライフジャケット 桜マーク 釣り"],
              ["クーラーボックス", "クーラーボックス 釣り"],
              ["釣具のセール品", "釣具 セール"],
            ].map(([label, kw]) => (
              <li key={label}>
                <a href={rakutenSearchUrl(kw)} rel="sponsored nofollow noopener" target="_blank">{label}</a>
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        道具の選び方は<Link href="/gear/">おすすめの釣り道具</Link>で解説しています。
      </p>
    </article>
  );
}
