// 釣り場データ。公式情報で確認できたものだけ published: true にする（要件定義のルール）。
export type Spot = {
  slug: string;
  pref: "osaka" | "hyogo" | "wakayama" | "kyoto";
  name: string;
  area: string;
  address: string;
  type: "海釣り施設" | "公園の釣り場";
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
  catchReportUrl?: string; // 施設公式の釣果ページ
  intro: string;
};

export const PREF_LABEL: Record<Spot["pref"], string> = {
  osaka: "大阪府",
  hyogo: "兵庫県",
  wakayama: "和歌山県",
  kyoto: "京都府",
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
    catchReportUrl: "https://kobeumiduri.jp/fishresult/",
    intro:
      "明石海峡大橋と淡路島を望む、神戸市立の海釣り施設です。潮通しのよい明石海峡に近く、季節ごとにさまざまな魚が狙えます。",
  },
  {
    slug: "marina-city-tsuri-koen",
    pref: "wakayama",
    name: "和歌山マリーナシティ釣り公園",
    area: "和歌山市",
    address: "和歌山県和歌山市毛見（和歌山マリーナシティ内）",
    type: "海釣り施設",
    published: true,
    verifiedOn: "2026-10-18",
    officialUrl: "https://www.marinacity.com/tsuri/",
    sourceUrls: ["https://www.marinacity.com/tsuri/"],
    hours: "7:00〜17:00",
    closed: "毎週火曜（2026年10月は6・13・20・27日）",
    fees: [
      { label: "釣り（大人・中学生以上）", value: "1,000円" },
      { label: "釣り（小学生）", value: "600円" },
      { label: "小学生未満", value: "無料（大人の釣り枠内で釣る場合）" },
      { label: "見学", value: "見学のみの入園はなし（入園には釣り料金が必要）" },
      { label: "レンタル竿", value: "1,000円" },
    ],
    parking: "公式サイトでご確認ください",
    rentals: "レンタル竿あり。子ども用ライフジャケットの貸出あり",
    rules: [
      "中学生以下はライフジャケット（フローティングベスト）の着用が必要",
      "保護者の同伴がない小学生以下は入園不可",
      "園内での火気の使用は禁止",
      "所定の場所以外での釣りは禁止",
      "釣り場を必要以上に占有しない",
      "他人に危害を及ぼすおそれのある釣り方は控える",
    ],
    notes: [],
    tideStation: { code: "Z9", name: "海南" },
    catchReportUrl: "https://www.marinacity.com/tsuri/news/",
    intro:
      "和歌山マリーナシティ内にある、柵のある護岸で釣りができる施設です。レンタル竿があり、市場や温泉などの施設も近いため、家族での1日のおでかけにも向いています。",
  },
  {
    slug: "suma-umizuri-koen",
    pref: "hyogo",
    name: "須磨海づり公園",
    area: "神戸市須磨区",
    address: "兵庫県神戸市須磨区一ノ谷町5丁目地先",
    type: "海釣り施設",
    published: true,
    verifiedOn: "2026-10-18",
    officialUrl: "https://sumasakana-park.com/",
    sourceUrls: [
      "https://sumasakana-park.com/guide/",
      "https://sumasakana-park.com/4%E6%9C%88%E3%81%8B%E3%82%89%E3%81%AE%E9%96%8B%E5%9C%92%E6%99%82%E9%96%93/",
    ],
    hours: "月によって異なります（10月 6:00〜19:00、11〜3月 7:00〜17:00、5〜9月は土日祝の閉園が遅くなります）",
    closed: "毎週火曜（休日と7月21日〜8月31日は開園）、12月29日〜1月3日",
    fees: [
      { label: "釣り（16歳以上）", value: "4時間まで1,200円（以降1時間300円）" },
      { label: "釣り（6〜15歳）", value: "4時間まで700円（以降1時間170円）" },
      { label: "釣り（神戸市在住の65歳以上）", value: "4時間まで600円（以降1時間150円）" },
      { label: "見学", value: "大人200円／子ども100円" },
      { label: "レンタル竿（仕掛け付き）", value: "1,000円" },
    ],
    parking: "須磨浦公園駐車場（223台）を利用。料金は公式サイト・現地でご確認ください",
    rentals: "レンタル竿あり。売店で釣具・エサ・氷を販売（現金・キャッシュレス）",
    rules: [
      "竿釣り・手釣り以外の方法は禁止",
      "北釣台では内側に向けた投げ釣り・ルアー釣りは禁止",
      "集魚剤・赤土・ヌカなどの撒き餌は禁止",
      "ギャング釣り（ハゲ掛け・ボラ掛けなど）は禁止",
      "竿は1人2本まで",
      "夜間の投光器・集魚灯、テント・サンシェード、火気の使用は禁止",
      "開園前の場所取りは禁止、敷地内は終日禁煙、ペット同伴不可",
      "小学3年生以下はライフジャケットの着用が必要",
    ],
    notes: ["混雑時は入場が制限されることがあります（公式サイトのお知らせを確認してください）。"],
    tideStation: { code: "KB", name: "神戸" },
    intro:
      "2018年の台風被害による休園を経て、2024年11月にリニューアルオープンした神戸市立の海釣り施設です。レンタル竿や売店があり、手ぶらでも利用できます。",
  },
  {
    slug: "maizuru-shinkai-koen",
    pref: "kyoto",
    name: "舞鶴親海公園",
    area: "舞鶴市",
    address: "京都府舞鶴市字千歳897-1",
    type: "公園の釣り場",
    published: true,
    verifiedOn: "2026-10-18",
    officialUrl: "https://www.city.maizuru.kyoto.jp/kurashi/0000009016.html",
    sourceUrls: ["https://www.city.maizuru.kyoto.jp/kurashi/0000009016.html"],
    hours: "海釣り護岸：4・5・9・10・11月 7:00〜18:00／6〜8月 7:00〜19:00／12〜3月 7:00〜17:00",
    closed: "海釣り護岸：毎週水曜（祝日の場合は翌日）",
    fees: [{ label: "入園料", value: "無料" }],
    parking: "あり（台数・料金は市の公式ページに記載なし）",
    rentals: "市の公式ページに記載なし",
    rules: [
      "釣りのルールは現地の掲示と管理者の指示に従ってください（市の公式ページには詳しい記載がありません）",
    ],
    notes: ["問い合わせ先：舞鶴市 水産課（0773-66-1020）"],
    tideStation: { code: "MZ", name: "舞鶴" },
    intro:
      "舞鶴湾に面した舞鶴市の公園で、海釣り護岸を無料で利用できます。日本海側（京都府北部）で家族連れが釣りを始めやすい場所の一つです。",
  },
  {
    slug: "sakai-umizuri-terrace",
    pref: "osaka",
    name: "海とのふれあい広場 海釣りテラス",
    area: "堺市堺区",
    address: "大阪府堺市堺区匠町6番1（海とのふれあい広場内）",
    type: "公園の釣り場",
    published: true,
    verifiedOn: "2026-10-18",
    officialUrl: "https://www.city.sakai.lg.jp/shisei/toshi/rinkai/umifureai/umizuriterasu.html",
    sourceUrls: [
      "https://www.city.sakai.lg.jp/shisei/toshi/rinkai/umifureai/umizuriterasu.html",
      "https://www.city.sakai.lg.jp/shisei/toshi/rinkai/umifureai/index.html",
    ],
    hours: "9:00〜17:00（7月の海の日前の土曜〜8月末の土日祝は7:00〜19:00）",
    closed: "閉園日なし（気象警報の発令時や行事のときは閉鎖する場合あり）",
    fees: [{ label: "利用料", value: "堺市の公式ページに料金の記載はありません" }],
    parking: "第1駐車場を利用（第2駐車場は閉鎖中）。17時に閉門",
    rentals: "堺市の公式ページに記載なし",
    rules: [
      "投げ釣り・まき餌・危険な釣りは禁止（サビキ釣りは可）",
      "竿は1人2本まで",
      "走る・手すりに登る・泥酔状態での釣りは禁止",
      "海釣りテラス内は禁煙、ペット同伴不可",
      "花火・テント・火気（専用エリア以外のバーベキュー）は禁止",
      "小学生以下は保護者の同伴が必要",
      "ゴミは持ち帰る。警備員・係員の指示に従う",
    ],
    notes: [],
    tideStation: { code: "SI", name: "堺" },
    intro:
      "堺市の「海とのふれあい広場」にある釣り用のテラスです。投げ釣りやまき餌は禁止されていますが、サビキ釣りで手軽に楽しめます。",
  },
];

export const publishedSpots = () => SPOTS.filter((s) => s.published);
