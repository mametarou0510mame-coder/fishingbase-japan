// エリア定義。釣り場（lib/spots.ts の slug）をエリアにまとめる。
export type Area = {
  slug: string;
  name: string;
  region: string; // 含まれる地域
  spots: string[];
  intro: string;
};

export const AREAS: Area[] = [
  {
    slug: "osaka-bay-north",
    name: "大阪湾奥",
    region: "大阪市（南港・舞洲・北港）・堺・尼崎・西宮・芦屋",
    spots: [
      "sakai-umizuri-terrace",
      "nanko-uotsuri-en",
      "amagasaki-uotsuri-koen",
      "mukogawa-ichimonji",
      "maishima-seaside-promenade",
      "yumemai-ohashi-shita",
      "naruohama-umizuri-hiroba",
      "yumeshima-hato-yazawa",
      "minami-ashiyahama-minami-gogan",
    ],
    intro: "大阪湾の奥にあたるエリアです。市街地から近く、短い時間でも釣りに行きやすい施設が集まっています。",
  },
  {
    slug: "kobe-akashi",
    name: "神戸・明石",
    region: "神戸市（空港島・須磨・垂水）・明石市",
    spots: ["kobe-airport-shinsui-gogan", "suma-umizuri-koen", "hiraiso-umizuri-koen", "azur-maiko-shinsui-gogan", "okura-kaigan-higashi", "nakasaki-veranda-gogan"],
    intro: "明石海峡に近く、潮の流れがあるエリアです。秋には青物（ハマチなど）が回ってくることもあります。",
  },
  {
    slug: "awaji",
    name: "淡路島",
    region: "淡路市・洲本市・南あわじ市",
    spots: ["minamiawaji-megafloat"],
    intro: "大阪湾と播磨灘、紀伊水道に囲まれた島です。潮通しが良く、青物やアオリイカなど大物の実績も豊富です。",
  },
  {
    slug: "senshu",
    name: "泉州",
    region: "泉大津市〜泉南郡岬町",
    spots: ["shiomi-futo", "tadaoka-suigintou", "kishiwada-ichimonji", "kaizuka-jinkoto", "totto-park-kojima"],
    intro: "大阪湾の南側のエリアです。泉大津・忠岡の埠頭、沖堤防の岸和田一文字、貝塚人工島から、紀淡海峡に近い岬町の海釣り公園まであります。",
  },
  {
    slug: "wakayama",
    name: "和歌山",
    region: "和歌山市・海南市・由良町",
    spots: ["marina-city-tsuri-koen", "shimotsu-pialand", "yura-umizuri-koen"],
    intro: "紀伊水道に面したエリアです。観光施設と組み合わせて家族で出かけやすい釣り場があります。",
  },
  {
    slug: "maizuru",
    name: "京都北部・舞鶴",
    region: "京都府舞鶴市・京丹後市",
    spots: ["maizuru-shinkai-koen", "amino-asamogawa-ko", "taiza-ko"],
    intro: "日本海側の舞鶴湾と丹後半島のエリアです。大阪湾とは潮や釣れる魚の時期が異なります。",
  },
];

export const findArea = (slug: string) => AREAS.find((a) => a.slug === slug);
export const areaOfSpot = (spotSlug: string) => AREAS.find((a) => a.spots.includes(spotSlug));
