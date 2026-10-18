// 投稿フォームの選択肢（釣り場・魚種・釣り方・時間帯）を作る。
// フォーム（public/data/post-options.json）と受付サーバー（worker/allowed.json）で同じ内容を使う。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SPECIES_DICT } from "./catch-parsers.mjs";

const src = readFileSync(new URL("../lib/spots.ts", import.meta.url), "utf8");
const spots = [];
for (const block of src.split(/\n  \{\n/).slice(1)) {
  const slug = block.match(/slug: "([^"]+)"/)?.[1];
  const name = block.match(/\bname: "([^"]+)"/)?.[1];
  const published = /published: true/.test(block);
  if (slug && name && published) spots.push({ slug, name });
}
const species = SPECIES_DICT.map(([canon]) => canon).filter((c) => !/種類不明|・サバ・/.test(c));
species.push("その他");
const methods = ["サビキ", "ウキ釣り", "フカセ", "投げ釣り", "ちょい投げ", "穴釣り", "落とし込み", "胴突き", "ノマセ（泳がせ）", "テンヤ", "ルアー", "エギング", "その他"];
const times = ["早朝", "午前", "午後", "夕方", "夜"];
const out = { spots, species, methods, times };
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/post-options.json", import.meta.url), JSON.stringify(out) + "\n");
writeFileSync(new URL("../worker/allowed.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(`[post-options] 釣り場${spots.length} 魚種${species.length}`);
