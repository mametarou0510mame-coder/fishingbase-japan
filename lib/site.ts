// サイト全体の設定値。
export const SITE = {
  // 2026-10-18 「FishingBase Japan」から改名（類似サービスとの混同回避）
  name: "ツレドキ関西",
  nameRomaji: "Tsuredoki Kansai",
  tagline: "関西の釣果・潮・釣り場情報をひとつに",
  url: "https://tsuredoki-kansai.mametarou0510mame.workers.dev",
  instagram: "https://www.instagram.com/tsuredokikansai",
  instagramHandle: "@tsuredokikansai",
  youtube: "https://www.youtube.com/@%E3%83%84%E3%83%AC%E3%83%89%E3%82%AD%E9%96%A2%E8%A5%BF",
  // 公開用の問い合わせ先（2026-10-18 オーナー確定）
  contactEmail: "mametarou0510mame@gmail.com",
  // 検索エンジンへの登録（2026-10-18 解除）。true にすると全ページ noindex。
  noindex: false,
  policyUpdated: "2026年10月22日",
  // 釣果投稿（Cloudflare Turnstile のサイトキー。公開してよい値）。空のあいだは投稿フォームを「準備中」にする
  turnstileSiteKey: "",
  // Google AdSense のサイト運営者ID（例: "ca-pub-1234567890123456"。公開してよい値）。空のあいだは広告コードを出さない
  adsenseClient: "",
} as const;
