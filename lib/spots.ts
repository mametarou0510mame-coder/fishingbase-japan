// 釣り場データ。公式情報で確認できたものだけ published: true にする（要件定義のルール）。
export type Spot = {
  slug: string;
  pref: "osaka" | "hyogo" | "wakayama";
  name: string;
  area: string;
  address: string;
  type: "海釣り施設";
  published: boolean;
  verifiedOn: string; // 公式情報を確認した日
  officialUrl: string;
  sourceUrls: string[];
  hours: string;
  closed: string;
  fees: { label: string; value: string }[];
  parking: string;
  rentals: string;
  rules: string[];
  notes: string[];
  tideStation: { code: string; name: string };
  intro: string;
};

export const PREF_LABEL: Record<Spot["pref"], string> = {
  osaka: "大阪府",
  hyogo: "兵庫県",
  wakayama: "和歌山県",
};

export const SPOTS: Spot[] = [
  {
    slug: "amagasaki-uotsuri-koen",
    pref: "hyogo",
    name: "尼崎市立魚つり公園",
    area: "尼崎市",
    address: "兵庫県尼崎市平左衛門町66",
    type: "海釣り施設",
    published: true,
    verifiedOn: "2026-10-18",
    officialUrl: "https://amagasaki-uoturikouen.com/",
    sourceUrls: ["https://amagasaki-uoturikouen.com/guide.html"],
    hours: "5・6・11月 6:00〜19:00／7〜10月 5:00〜20:00／12〜4月 7:00〜17:00",
    closed: "毎週火曜（祝日の場合はその直後の祝日以外の日）、12月31日〜1月1日、天候不良の日",
    fees: [
      { label: "釣り（大人）", value: "830円" },
      { label: "釣り（6歳以上16歳未満）", value: "410円" },
      { label: "見学（大人／子ども）", value: "200円／100円" },
      { label: "レンタル竿", value: "仕掛け付き1,500円／仕掛けなし1,300円" },
    ],
    parking: "あり（30分単位の有料。普通車は最大800円）",
    rentals: "レンタル竿、仕掛け・エサ・氷の売店あり。小学3年生以下はライフジャケット無料貸出",
    rules: [
      "竿釣り・手釣り以外の方法は禁止",
      "危険な投げ釣り・ルアー釣りは禁止",
      "ペット同伴、火気の使用は禁止",
      "柵・手すりへの登りや腰掛け、釣台での走行は禁止",
      "荷物などによる場所の独占は禁止",
      "10歳以下は大人の同伴が必要（16歳未満は18時以降も同伴が必要）",
    ],
    notes: ["混雑時は入園や竿の本数が制限される場合があります。"],
    tideStation: { code: "AM", name: "尼崎" },
    intro:
      "武庫川の河口から沖へ延びる桟橋型の海釣り施設です。指導員が常駐し、レンタル竿もあるため、道具を持っていない初心者や家族連れでも始めやすい釣り場です。",
  },
  {
    slug: "hiraiso-umizuri-koen",
    pref: "hyogo",
    name: "平磯海づり公園",
    area: "神戸市垂水区",
    address: "兵庫県神戸市垂水区平磯1丁目1番66号",
    type: "海釣り施設",
    published: true,
    verifiedOn: "2026-10-18",
    officialUrl: "https://kobeumiduri.jp/",
    sourceUrls: [
      "https://kobeumiduri.jp/",
      "https://www.city.kobe.lg.jp/a67688/675097559697.html",
    ],
    hours: "月によって異なります（2026年10月は平日・日祝 6:00〜19:00、土曜 6:00〜21:00）",
    closed: "毎週木曜（祝日は開園）",
    fees: [
      { label: "釣り（大人・3〜11月）", value: "4時間 1,200円（以降1時間300円）" },
      { label: "釣り（小人・3〜11月）", value: "4時間 600円（以降1時間150円）" },
      { label: "釣り（大人／小人・12〜2月）", value: "4時間 800円／500円" },
      { label: "見学", value: "大人200円／小人100円" },
    ],
    parking: "あり（普通車 4時間700円、以降1時間150円）",
    rentals: "公式サイトでご確認ください",
    rules: [
      "集魚剤・赤土・ぬか等の使用は禁止",
      "置き竿・荷物による場所取りは禁止",
      "竿は1人3本まで",
      "火気の使用は禁止（屋外バーベキュー場を除く）",
      "ペットの入園は禁止（補助犬を除く）",
      "小学3年生以下はライフジャケットの着用が必要",
      "投げる場合は周囲をよく確認する",
    ],
    notes: [
      "料金は2026年4月1日改定後のもの。ゴールデンウィークなどの特定日は料金が異なります。",
    ],
    tideStation: { code: "AK", name: "明石" },
    intro:
      "明石海峡大橋と淡路島を望む、神戸市立の海釣り施設です。潮通しのよい明石海峡に近く、季節ごとにさまざまな魚が狙えます。",
  },
];

export const publishedSpots = () => SPOTS.filter((s) => s.published);
