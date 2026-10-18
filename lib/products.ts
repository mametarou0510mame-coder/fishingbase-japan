import type { GearKey, GearTag } from "@/lib/gear";

// おすすめ商品。ASPの管理画面で作ったリンクを links に入れる（リンクがない商品は表示しない）。
// 選定方針（/pr-policy/）：釣り場のルールと用途に合うかで選び、手数料の高さでは選ばない。
export type Product = {
  id: string;
  name: string;
  gear: GearKey;
  tags?: GearTag[];
  sakuraMark?: boolean; // 桜マーク・CSマーク付きのライフジャケット
  point: string; // おすすめする理由（一文）
  priceNote?: string; // 価格帯の目安（例：「3,000円前後」）
  links: { amazon?: string; rakuten?: string; yahoo?: string };
  checkedOn: string; // リンク・販売状況を確認した日
};

// ASP（楽天アフィリエイト・もしもアフィリエイト）登録後に追加する
export const PRODUCTS: Product[] = [];

export const productsFor = (gear: GearKey) =>
  PRODUCTS.filter((p) => p.gear === gear && (p.links.amazon || p.links.rakuten || p.links.yahoo));
