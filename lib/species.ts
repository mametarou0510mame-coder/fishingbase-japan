import type { GearKey } from "@/lib/gear";

// 魚種データ。時期は関西（大阪湾・播磨灘・紀伊水道周辺）の岸釣りでの一般的な目安。
// 年や水温で前後するため、ページ上でも「目安」と明記する。
export type Gear = {
  name: string; // 道具の種類（商品名ではない）
  note: string;
  key?: GearKey; // 広告リンクの対象（lib/gear.ts）。エサなど通販に向かないものは付けない
};

export type Species = {
  slug: string;
  name: string;
  kana: string;
  aliases: string[];
  months: number[]; // 釣れやすい月（目安）
  peakMonths: number[]; // 特によい時期（目安）
  bestTime: string;
  summary: string;
  methods: { name: string; detail: string }[];
  gear: Gear[];
  caution: string[];
};

export const SPECIES: Species[] = [
  {
    slug: "aji",
    name: "アジ",
    kana: "あじ",
    aliases: ["豆アジ", "小アジ"],
    months: [5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [7, 8, 9, 10],
    bestTime: "朝夕のまずめ時。群れが回ってくると日中も釣れます。",
    summary:
      "海釣り施設で最も身近なターゲットです。夏は10cm前後の豆アジが多く、秋に向けて少しずつサイズが上がります。",
    methods: [
      { name: "サビキ釣り", detail: "コマセ（撒き餌）を入れたカゴと疑似針の仕掛け。足元に落とすだけなので初心者向けです。撒き餌が禁止の施設ではカゴを使わない方法を選びます。" },
      { name: "アジング", detail: "小さなワーム（ルアー）で狙う方法。夜の常夜灯まわりで人気です。ルアー釣り禁止の施設では使えません。" },
    ],
    gear: [
      { name: "2〜3m前後の万能竿またはサビキ用セット竿", note: "初めてならリール付きのセットが手軽です", key: "sabiki-set" },
      { name: "サビキ仕掛け（針の大きさ3〜5号程度）", note: "豆アジの時期は小さい針が向きます", key: "sabiki-rig" },
      { name: "アミエビ（撒き餌）とカゴ", note: "撒き餌が禁止の施設では使いません", key: "chum-cage" },
      { name: "クーラーボックスと氷", note: "釣った魚の鮮度を保ちます", key: "cooler" },
    ],
    caution: ["釣り場によっては撒き餌やルアー釣りが禁止されています。各釣り場のルールを確認してください。"],
  },
  {
    slug: "saba",
    name: "サバ",
    kana: "さば",
    aliases: ["小サバ"],
    months: [6, 7, 8, 9, 10, 11],
    peakMonths: [8, 9, 10],
    bestTime: "朝のまずめ時が中心。群れが入ると一気に釣れます。",
    summary: "夏から秋にアジと一緒にサビキ釣りで釣れることが多い魚です。引きが強く、子どもでも釣った手応えを楽しめます。",
    methods: [
      { name: "サビキ釣り", detail: "アジと同じ仕掛けで釣れます。群れが入ると仕掛けが絡みやすいので、取り込みは手早く行います。" },
    ],
    gear: [
      { name: "2〜3m前後の万能竿", note: "アジと共通で使えます", key: "sabiki-set" },
      { name: "サビキ仕掛け（針の大きさ4〜6号程度）", note: "サバの群れが多い時期はやや大きめが扱いやすいです", key: "sabiki-rig" },
      { name: "クーラーボックスと氷", note: "サバは傷みやすいので、すぐに冷やします", key: "cooler" },
    ],
    caution: ["サバは傷みが早い魚です。釣ったらすぐに冷やし、持ち帰ったら早めに調理してください。"],
  },
  {
    slug: "tachiuo",
    name: "タチウオ",
    kana: "たちうお",
    aliases: ["太刀魚"],
    months: [7, 8, 9, 10, 11, 12],
    peakMonths: [9, 10, 11],
    bestTime: "夕まずめから夜にかけて。日没前後の短い時間に釣れることが多いです。",
    summary: "関西の秋の人気ターゲットです。夕方から夜に岸近くまで回ってくるため、施設の閉園時間に注意して計画します。",
    methods: [
      { name: "ウキ釣り（キビナゴなどのエサ）", detail: "電気ウキを使い、エサを夜の海中に漂わせます。" },
      { name: "ワインド・メタルジグ（ルアー）", detail: "ルアーを投げて狙う方法。ルアー釣りや投げ釣りが禁止の施設では使えません。" },
    ],
    gear: [
      { name: "3〜4m前後の磯竿またはルアー竿", note: "釣り方に合わせて選びます", key: "tachiuo-rod" },
      { name: "電気ウキとタチウオ用の仕掛け（ワイヤー付き）", note: "歯が鋭く糸を切られやすいため、ワイヤーが付いたものが安心です", key: "tachiuo-rig" },
      { name: "フィッシュグリップ（魚つかみ）", note: "鋭い歯から手を守ります", key: "fish-grip" },
      { name: "ヘッドライト", note: "夜釣りの必需品です", key: "headlamp" },
    ],
    caution: [
      "歯が非常に鋭いので、素手でつかまないでください。",
      "夜釣りになるため、施設の閉園時間と足元の安全に注意してください。",
    ],
  },
  {
    slug: "chinu",
    name: "チヌ（クロダイ）",
    kana: "ちぬ",
    aliases: ["クロダイ", "黒鯛"],
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [4, 5, 6, 9, 10],
    bestTime: "朝夕のまずめ時。濁りのある日もチャンスです。",
    summary: "関西では一年を通して狙える魚です。春の産卵期（乗っ込み）と秋が特に釣りやすい時期とされます。",
    methods: [
      { name: "ウキ釣り", detail: "エビなどのエサをウキで漂わせます。撒き餌が禁止の施設ではエサだけで狙います。" },
      { name: "落とし込み・ヘチ釣り", detail: "岸壁ぎわにエサを落として狙う方法です。" },
    ],
    gear: [
      { name: "4〜5m前後の磯竿", note: "ウキ釣りに向いています", key: "iso-rod" },
      { name: "ウキ仕掛けとチヌ用の針", note: "エサに合わせて針の大きさを選びます", key: "uki-rig" },
      { name: "タモ網（玉網）", note: "大きなチヌを取り込むときに必要です", key: "tamo" },
    ],
    caution: ["釣り場によっては撒き餌が禁止されています。"],
  },
  {
    slug: "mebaru",
    name: "メバル",
    kana: "めばる",
    aliases: [],
    months: [12, 1, 2, 3, 4, 5],
    peakMonths: [2, 3, 4],
    bestTime: "夕方から夜。暗くなってから活発にエサを追います。",
    summary: "冬から春の代表的なターゲットです。大きな目が特徴で、春を告げる魚として知られています。",
    methods: [
      { name: "ウキ釣り（エビなどのエサ）", detail: "表層から中層を漂わせて狙います。" },
      { name: "メバリング（ルアー）", detail: "小さなワームやプラグで狙う方法。ルアー釣り禁止の施設では使えません。" },
    ],
    gear: [
      { name: "3〜4m前後の竿", note: "軽い仕掛けが扱いやすい竿が向いています", key: "light-rod" },
      { name: "ウキ仕掛けまたは小型ルアー", note: "釣り場のルールに合わせて選びます", key: "mebaru-rig" },
      { name: "ヘッドライト", note: "夕方以降の釣りに必要です", key: "headlamp" },
    ],
    caution: ["夜の釣りになることが多いので、施設の閉園時間と防寒対策に注意してください。"],
  },
  {
    slug: "gashira",
    name: "ガシラ（カサゴ）",
    kana: "がしら",
    aliases: ["カサゴ"],
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [11, 12, 1, 2, 3],
    bestTime: "時間帯を問わず釣れますが、夕方以降に活発になります。",
    summary: "岩やテトラポッドの隙間に住む根魚です。一年中狙え、足元を探るだけで釣れるため初心者にも向いています。",
    methods: [
      { name: "穴釣り・ブラクリ", detail: "オモリと針が一体になった仕掛けで、足元の隙間を探ります。" },
      { name: "胴突き仕掛け", detail: "足元の底付近を狙います。" },
    ],
    gear: [
      { name: "1.5〜2m前後の短い竿", note: "足元を探る釣りに向いています", key: "short-rod" },
      { name: "ブラクリ仕掛け", note: "根掛かりしやすいので予備を多めに用意します", key: "burakuri" },
      { name: "エサ（サバの切り身・イソメなど）", note: "釣具店で購入できます" },
    ],
    caution: ["背びれのトゲが鋭いので、つかむときは注意してください。"],
  },
];

export const findSpecies = (slug: string) => SPECIES.find((s) => s.slug === slug);
export const speciesInMonth = (m: number) => SPECIES.filter((s) => s.months.includes(m));

export function monthRangeLabel(months: number[]): string {
  if (months.length === 12) return "通年";
  // 連続する月をまとめる（年をまたぐ範囲にも対応）
  const set = new Set(months);
  const starts = months.filter((m) => !set.has(m === 1 ? 12 : m - 1));
  return starts
    .map((start) => {
      let end = start;
      while (set.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== start) end = end === 12 ? 1 : end + 1;
      return start === end ? `${start}月` : `${start}〜${end}月`;
    })
    .join("、");
}

// 釣果データの魚種名（例：「アジ・サバ・イワシ」「ガシラ（カサゴ）」）から、魚種ページのデータを探す
export function speciesFromCatchName(catchName: string): Species[] {
  const parts = catchName.split("・").map((p) => p.replace(/（.*?）/g, "").trim());
  const extra = (catchName.match(/（(.*?)）/g) ?? []).map((x) => x.slice(1, -1));
  const names = [...parts, ...extra];
  return SPECIES.filter((s) => names.some((n) => n === s.name || s.aliases.includes(n)));
}
