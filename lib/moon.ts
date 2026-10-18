// 月齢と潮名（大潮・中潮など）。新月の時刻は Meeus「Astronomical Algorithms」49章の式（主要な補正項まで）で求める。
// 潮名は旧暦の日付（新月の日を1日とする）から決める一般的な区分で、目安。

const rad = Math.PI / 180;

// k番目の新月（2000年1月の新月を k=0 とする）のユリウス日（力学時。数十秒の差は無視）
function newMoonJde(k: number): number {
  const T = k / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * rad;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * rad;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * rad;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * rad;
  jde +=
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(Om);
  return jde;
}

const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000;
const jstDay = (ms: number) => Math.floor((ms + 9 * 3600e3) / 86400000); // 日本時間の通日

// date: "YYYY-MM-DD"（日本時間）
export function moonInfo(date: string): { age: number; lunarDay: number; tideName: string } {
  const [y, m, d] = date.split("-").map(Number);
  const noonJst = Date.UTC(y, m - 1, d, 3); // 日本時間12時
  let k = Math.floor((noonJst / 86400000 + 2440587.5 - 2451550.09766) / 29.530588861);
  // 対象日以前の直近の新月（日本時間の日付）を探す
  while (jstDay(jdToMs(newMoonJde(k + 1))) <= jstDay(noonJst)) k++;
  while (jstDay(jdToMs(newMoonJde(k))) > jstDay(noonJst)) k--;
  const nm = jdToMs(newMoonJde(k));
  // 新月の日の正午が新月時刻より前なら、月齢は前の周期から数える
  const base = noonJst >= nm ? nm : jdToMs(newMoonJde(k - 1));
  const age = Math.round(((noonJst - base) / 86400000) * 10) / 10;
  const lunarDay = jstDay(noonJst) - jstDay(nm) + 1; // 新月の日 = 1日
  return { age, lunarDay, tideName: tideNameOf(lunarDay) };
}

export function tideNameOf(lunarDay: number): string {
  const d = lunarDay;
  if (d <= 3 || d >= 30) return "大潮";
  if (d <= 6) return "中潮";
  if (d <= 9) return "小潮";
  if (d === 10) return "長潮";
  if (d === 11) return "若潮";
  if (d <= 13) return "中潮";
  if (d <= 18) return "大潮";
  if (d <= 21) return "中潮";
  if (d <= 24) return "小潮";
  if (d === 25) return "長潮";
  if (d === 26) return "若潮";
  return "中潮";
}
