// サイト全体の設定値。
export const SITE = {
  // 2026-10-18 「FishingBase Japan」から改名（類似サービスとの混同回避）
  name: "ツレドキ関西",
  nameRomaji: "Tsuredoki Kansai",
  tagline: "関西の釣果・潮・釣り場情報をひとつに",
  url: "https://fishingbase-japan.mametarou0510mame.workers.dev",
  instagram: "https://www.instagram.com/fishingbase.japan",
  instagramHandle: "@fishingbase.japan",
  // 公開用の問い合わせ先（2026-10-18 オーナー確定）
  contactEmail: "mametarou0510mame@gmail.com",
  // 検索エンジンへの登録。改名に合わせたURL・SNSの変更が済むまで true のまま。
  noindex: true,
  policyUpdated: "2026年10月18日",
} as const;
