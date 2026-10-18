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

// 道具ごとの通販検索ワードと使い方の性質。検索結果ページへのリンクにすると、売り切れでリンクが切れない。
export const GEAR_INFO: Record<GearKey, { keyword: string; tags?: GearTag[] }> = {
  lifejacket: { keyword: "ライフジャケット 桜マーク 釣り" },
  "sabiki-set": { keyword: "サビキ セット 竿 リール" },
  "sabiki-rig": { keyword: "サビキ 仕掛け" },
  "chum-cage": { keyword: "サビキ カゴ アミエビ", tags: ["chum"] },
  cooler: { keyword: "クーラーボックス 釣り" },
  "tachiuo-rod": { keyword: "タチウオ ロッド 堤防" },
  "tachiuo-rig": { keyword: "タチウオ 仕掛け 電気ウキ ワイヤー" },
  "fish-grip": { keyword: "フィッシュグリップ" },
  headlamp: { keyword: "ヘッドライト 釣り" },
  "iso-rod": { keyword: "磯竿 チヌ" },
  "uki-rig": { keyword: "チヌ ウキ 仕掛け" },
  tamo: { keyword: "タモ網 釣り 玉網" },
  "light-rod": { keyword: "メバル ロッド" },
  "mebaru-rig": { keyword: "メバル 仕掛け ウキ" },
  "short-rod": { keyword: "穴釣り 竿" },
  burakuri: { keyword: "ブラクリ 仕掛け" },
};

export const SAFETY_NOTE: Partial<Record<Restriction, string>> = {
  "sakura-lifejacket": "この釣り場は、桜マークまたはCSマーク付きのライフジャケットだけが認められています。",
  "lifejacket-required": "この釣り場はライフジャケットの着用が入場の条件です。",
};
