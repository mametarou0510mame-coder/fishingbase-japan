// サイト全体の設定値。公開前に CONTACT_EMAIL を確定させること。
export const SITE = {
  name: "FishingBase Japan",
  tagline: "関西の釣果・潮・釣り場情報をひとつに",
  url: "https://fishingbase-japan.pages.dev",
  instagram: "https://www.instagram.com/fishingbase.japan",
  // 公開用の問い合わせ先（2026-10-18 オーナー確定）
  contactEmail: "mametarou0510mame@gmail.com",
  // 公開準備中は検索エンジンに登録させない。正式公開時に false にする。
  noindex: true,
  policyUpdated: "2026年10月18日",
} as const;
