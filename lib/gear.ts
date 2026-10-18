// 道具の種類と、釣り場のルールとの対応。
// 商品（lib/products.ts）は「道具の種類（GearKey）」にひも付け、釣り場の禁止事項に合わないものは出さない。

export type GearKey =
  | "lifejacket"
  | "sabiki-set"
  | "sabiki-rig"
  | "chum-cage"
  | "cooler"
  | "tachiuo-rod"
  | "tachiuo-rig"
  | "fish-grip"
  | "headlamp"
  | "iso-rod"
  | "uki-rig"
  | "tamo"
  | "light-rod"
  | "mebaru-rig"
  | "short-rod"
  | "burakuri";

// 道具の使い方の性質
export type GearTag = "chum" | "lure" | "cast";

// 釣り場の禁止事項・必須事項（lib/spots.ts）
export type Restriction = "no-chum" | "no-lure" | "no-cast" | "sakura-lifejacket" | "lifejacket-required";

const BLOCKS: Record<GearTag, Restriction> = { chum: "no-chum", lure: "no-lure", cast: "no-cast" };

export function allowed(tags: GearTag[] | undefined, restrictions: Restriction[] | undefined) {
  if (!tags || !restrictions) return true;
  return !tags.some((t) => restrictions.includes(BLOCKS[t]));
}

export const SAFETY_NOTE: Partial<Record<Restriction, string>> = {
  "sakura-lifejacket": "この釣り場は、桜マークまたはCSマーク付きのライフジャケットだけが認められています。",
  "lifejacket-required": "この釣り場はライフジャケットの着用が入場の条件です。",
};
