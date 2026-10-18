import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Deal = {
  name: string;
  price: number | null;
  url: string;
  image: string;
  shop: string;
  pointRate: number;
  pointEnd: string;
  review: number | null;
  reviewCount: number;
};
export type DealData = { updatedOn: string; categories: { key: string; label: string; kind?: "point" | "popular"; unverified?: boolean; items: Deal[] }[] };

export function loadDeals(): DealData | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "public/data/deals.json"), "utf8"));
  } catch {
    return null;
  }
}
