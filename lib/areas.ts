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
    region: "横浜市・川崎市・横須賀市・東京都江東区・千葉県市原市",
    spots: ["honmoku-umizuri-shisetsu", "daikoku-umizuri-shisetsu", "isogo-umizuri-shisetsu", "higashi-ogishima-nishi-koen", "yokosuka-umibe-tsuri-koen", "wakasu-kaihin-koen-umizuri", "ichihara-umizuri-koen"],
    intro: "東京湾に面した関東のエリアです。横浜市の3つの海づり施設、東京都の若洲海浜公園、市原市の海づり公園など、公共の海釣り施設が集まっています。",
  },
  {
    slug: "shizuoka",
    name: "静岡（駿河湾・熱海）",
    region: "静岡市清水区・熱海市",
    spots: ["shimizuko-umizuri-koen", "atami-umizuri-shisetsu"],
    intro: "駿河湾と相模湾に面した静岡のエリアです。2026年4月に清水港に新しい海づり施設ができ、熱海港には一年中開いている海釣り施設があります。",
  },
  {
    slug: "yamaguchi-kitakyushu",
    name: "山口・北九州",
    region: "山口県光市・下関市・福岡県北九州市",
    spots: ["fishing-park-hikari", "ganryujima", "wakita-umizuri-sanbashi"],
    intro: "瀬戸内海の西の端と、響灘に面したエリアです。桟橋型の海釣り施設で、手ぶらでも釣りを始められます。",
  },
  {
    slug: "kagoshima",
    name: "鹿児島・錦江湾",
    region: "鹿児島市（市街地・桜島）",
    spots: ["kamoike-umizuri-koen", "sakurajima-umizuri-koen"],
    intro: "桜島を望む錦江湾のエリアです。鹿児島市の海づり公園が、市街地と桜島に1か所ずつあります。",
  },
  {
    slug: "hokkaido",
    name: "北海道",
    region: "苫小牧市",
    spots: ["tomakomai-ippon-bohatei"],
    intro: "太平洋に面した北海道のエリアです。苫小牧港の防波堤が、春から秋の週末に釣り場として開放されています。",
  },
  {
    slug: "tohoku",
    name: "東北（青森・福島）",
    region: "青森市浅虫・福島県新地町・いわき市小名浜",
    spots: ["asamushi-umizuri-koen", "shinchi-umitsuri-koen", "onahama-2go-futo", "iwaki-sun-marina-tsuri-sanbashi"],
    intro: "陸奥湾と福島の浜通りのエリアです。冬は休む施設もあるので、営業期間を確かめてから出かけましょう。",
  },
  {
    slug: "ibaraki-kashima",
    name: "茨城・鹿島",
    region: "茨城県鹿嶋市",
    spots: ["kashimako-uotsurien"],
    intro: "太平洋の鹿島灘に面したエリアです。鹿島港の中に、市の海釣り施設があります。",
  },
  {
    slug: "aichi-mikawa",
    name: "愛知・衣浦湾",
    region: "愛知県碧南市",
    spots: ["hekinan-tsuri-hiroba"],
    intro: "三河湾の奥、衣浦湾の入口のエリアです。無料で使える岸壁の釣り広場があります。",
  },
  {
    slug: "hiroshima",
    name: "広島湾",
    region: "広島市西区",
    spots: ["kannon-higashi-bohatei"],
    intro: "瀬戸内海の広島湾のエリアです。市街地の近くで、県が開放している防波堤から釣りができます。",
  },
  {
    slug: "nagasaki",
    name: "長崎",
    region: "長崎市高島町・新上五島町",
    spots: ["takashima-tobishima-isotsuri-koen", "aokata-ko-tsuri"],
    intro: "長崎港の沖と五島列島の、外海に面したエリアです。島の磯を整備した釣り公園や、漁協が案内する沖の防波堤の釣りがあります。",
  },
  {
    slug: "niigata",
    name: "新潟",
    region: "新潟市・聖籠町",
    spots: ["niigata-higashiko-dai2-higashi-bohatei", "niigata-nishikaigan-tottei"],
    intro: "日本海に面した新潟のエリアです。新潟東港の防波堤が春から秋に管理釣り場として開放され、新潟西港の西側には突堤が並びます。",
  },
  {
    slug: "chiba-boso",
    name: "千葉・南房総",
    region: "館山市",
    spots: ["tateyama-yuhi-sanbashi"],
    intro: "房総半島の南、館山湾のエリアです。館山港の長い桟橋が、無料の釣り場として開放されています。",
  },
];

export const findArea = (slug: string) => AREAS.find((a) => a.slug === slug);
export const areaOfSpot = (spotSlug: string) => AREAS.find((a) => a.spots.includes(spotSlug));
