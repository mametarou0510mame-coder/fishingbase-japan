import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";

// 道具の購入先リンク（楽天市場と、登録済みなら Amazon）。広告リンクなので rel="sponsored"
export default function ShopLinks({ keyword, className, short }: { keyword: string; className?: string; short?: boolean }) {
  const amz = amazonSearchUrl(keyword);
  return (
    <span className={`shop-links${className ? ` ${className}` : ""}`}>
      <a href={rakutenSearchUrl(keyword)} rel="sponsored nofollow noopener" target="_blank">
        {short ? "楽天" : "楽天市場で探す"}
      </a>
      {amz && (
        <>
          {" "}
          <a href={amz} rel="sponsored nofollow noopener" target="_blank">
            {short ? "Amazon" : "Amazonで探す"}
          </a>
        </>
      )}
    </span>
  );
}
