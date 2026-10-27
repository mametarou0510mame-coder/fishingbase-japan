// 関西以外の釣り場のページ。中身は関西の釣り場ページ（app/kansai/[pref]/[slug]/page.tsx）と同じ。
import { isKansai, publishedSpots } from "@/lib/spots";

export { default, generateMetadata } from "@/app/kansai/[pref]/[slug]/page";

export const dynamicParams = false;

export function generateStaticParams() {
  const list = publishedSpots()
    .filter((s) => !isKansai(s.pref))
    .map((s) => ({ pref: s.pref, slug: s.slug }));
  // 静的書き出しでは空にできないため、まだ関西以外がないあいだは「見つかりません」のページを1つだけ作る
  return list.length ? list : [{ pref: "_", slug: "_" }];
}
