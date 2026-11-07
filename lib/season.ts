// 季節営業の釣り場（冬は休む施設など）の営業期間。クライアントでも使う軽いモジュール。
// from・to は "MM-DD"。from > to のとき（例 11-01〜03-31）は年をまたぐ期間として扱う。
export type Season = { from: string; to: string; note: string };

export function inSeason(season: Season | undefined, date: string): boolean {
  if (!season) return true;
  const md = date.slice(5, 10);
  return season.from <= season.to ? md >= season.from && md <= season.to : md >= season.from || md <= season.to;
}

const jp = (md: string) => `${Number(md.slice(0, 2))}月${Number(md.slice(3, 5))}日`;
export const seasonLabel = (s: Season) => `${jp(s.from)}〜${jp(s.to)}`;
export const offSeasonNote = (s: Season) => `営業期間外です（営業は${seasonLabel(s)}ごろ。${s.note}）`;
