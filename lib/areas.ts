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
      "cosmo-square-kaihin-ryokuchi",
      "yamatogawa-kita-bohatei",
    ],
    intro: "大阪湾の奥にあたるエリアです。市街地から近く、短い時間でも釣りに行きやすい施設が集まっています。",
  },
  {
    slug: "kobe-akashi",
    name: "神戸・明石",
    region: "神戸市（六甲アイランド・空港島・須磨・垂水）・明石市",
    spots: ["kobe-airport-shinsui-gogan", "suma-umizuri-koen", "hiraiso-umizuri-koen", "azur-maiko-shinsui-gogan", "okura-kaigan-higashi", "nakasaki-veranda-gogan", "rokko-marine-park-umigo"],
    intro: "明石海峡に近く、潮の流れがあるエリアです。秋には青物（ハマチなど）が回ってくることもあります。",
  },
  {
    slug: "awaji",
    name: "淡路島",
    region: "淡路市・洲本市・南あわじ市",
    spots: ["minamiawaji-megafloat", "awaji-janohire-fishing-park"],
    intro: "大阪湾と播磨灘、紀伊水道に囲まれた島です。潮通しが良く、青物やアオリイカなど大物の実績も豊富です。",
  },
  {
    slug: "senshu",
    name: "泉州",
    region: "泉大津市〜泉南郡岬町",
    spots: ["shiomi-futo", "tadaoka-suigintou", "kishiwada-ichimonji", "kaizuka-jinkoto", "totto-park-kojima", "sennan-fishing-park-sazan", "kaijo-tsuribori-opa", "kaijo-tsuribori-tajiri", "kaijo-tsuribori-misaki"],
    intro: "大阪湾の南側のエリアです。泉大津・忠岡の埠頭、沖堤防の岸和田一文字、貝塚人工島から、紀淡海峡に近い岬町の海釣り公園まであります。",
  },
  {
    slug: "wakayama",
    name: "和歌山",
    region: "和歌山市（加太・友ヶ島）・海南市・広川町・由良町",
    spots: ["tomogashima", "kada-ohato", "wakayama-hokko-umizuri-koen", "saikazaki-seapark", "marina-city-tsuri-koen", "shimotsu-pialand", "tsuribori-kishu", "yura-umizuri-koen"],
    intro: "紀伊水道に面したエリアです。観光施設と組み合わせて家族で出かけやすい釣り場があります。",
  },
  {
    slug: "nanki-shirahama",
    name: "南紀・白浜",
    region: "和歌山県白浜町・田辺市・那智勝浦町周辺",
    spots: ["shirahama-katata-tsuribori", "shirahama-katata-ikada", "katsuura-watarinoshima"],
    intro: "黒潮が近い紀伊半島南部のエリアです。温泉地の白浜の海上釣り堀や筏釣りのほか、那智勝浦の港でも釣りができます。",
  },
  {
    slug: "harima",
    name: "播磨",
    region: "兵庫県高砂市・姫路市・加古川市周辺",
    spots: ["takasago-kaihin-koen"],
    intro: "播磨灘に面したエリアです。遠浅の砂浜がある海浜公園など、家族で出かけやすい場所があります。",
  },
  {
    slug: "maizuru",
    name: "京都北部・舞鶴",
    region: "京都府舞鶴市・京丹後市",
    spots: ["maizuru-shinkai-koen", "amino-asamogawa-ko", "taiza-ko"],
    intro: "日本海側の舞鶴湾と丹後半島のエリアです。大阪湾とは潮や釣れる魚の時期が異なります。",
  },
  {
    slug: "tokyo-bay",
    name: "東京湾（横浜・東京・千葉）",
    region: "横浜市・東京都江東区・千葉県市原市",
    spots: ["honmoku-umizuri-shisetsu", "daikoku-umizuri-shisetsu", "isogo-umizuri-shisetsu", "wakasu-kaihin-koen-umizuri", "ichihara-umizuri-koen"],
    intro: "東京湾に面した関東のエリアです。横浜市の3つの海づり施設、東京都の若洲海浜公園、市原市の海づり公園など、公共の海釣り施設が集まっています。",
  },
  {
    slug: "shizuoka",
    name: "静岡・駿河湾",
    region: "静岡市清水区",
    spots: ["shimizuko-umizuri-koen"],
    intro: "駿河湾に面した中部のエリアです。2026年4月に、清水港に新しい海づり施設ができました。",
  },
  {
    slug: "yamaguchi-kitakyushu",
    name: "山口・北九州",
    region: "山口県光市・福岡県北九州市",
    spots: ["fishing-park-hikari", "wakita-umizuri-sanbashi"],
    intro: "瀬戸内海の西の端と、響灘に面したエリアです。桟橋型の海釣り施設で、手ぶらでも釣りを始められます。",
  },
  {
    slug: "kagoshima",
    name: "鹿児島・錦江湾",
    region: "鹿児島市（市街地・桜島）",
    spots: ["kamoike-umizuri-koen", "sakurajima-umizuri-koen"],
    intro: "桜島を望む錦江湾のエリアです。鹿児島市の海づり公園が、市街地と桜島に1か所ずつあります。",
  },
];

export const findArea = (slug: string) => AREAS.find((a) => a.slug === slug);
export const areaOfSpot = (spotSlug: string) => AREAS.find((a) => a.spots.includes(spotSlug));
