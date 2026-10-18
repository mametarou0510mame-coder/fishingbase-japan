import Link from "next/link";
import type { Product } from "@/lib/products";

// 広告（アフィリエイト）リンクの枠。景品表示法のステマ規制に対応して「PR」を必ず表示する。
export default function AffiliateBox({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="aff">
      <p className="aff-label">
        <span className="pr">PR</span> 広告リンクを含みます（<Link href="/pr-policy/">選定方針</Link>）
      </p>
      {products.map((p) => (
        <div key={p.id} className="aff-item">
          <p className="aff-name">
            {p.name}
            {p.sakuraMark && <span className="badge-s">桜マーク</span>}
          </p>
          <p className="small">
            {p.point}
            {p.priceNote && `（${p.priceNote}）`}
          </p>
          <p className="aff-links">
            {p.links.amazon && (
              <a href={p.links.amazon} rel="sponsored nofollow noopener" target="_blank">Amazon</a>
            )}
            {p.links.rakuten && (
              <a href={p.links.rakuten} rel="sponsored nofollow noopener" target="_blank">楽天市場</a>
            )}
            {p.links.yahoo && (
              <a href={p.links.yahoo} rel="sponsored nofollow noopener" target="_blank">Yahoo!ショッピング</a>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
