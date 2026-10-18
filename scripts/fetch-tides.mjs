// ビルド前に気象庁の潮位表（年1ファイル/地点）を取得し、public/data/tides/ にJSONで保存する。
// 取得に失敗してもビルドは止めない（その地点の潮汐表示が「準備中」になるだけ）。
// 出典: 気象庁ホームページ「潮位表」 https://www.data.jma.go.jp/kaiyou/db/tide/suisan/index.php
import { mkdir, writeFile } from "node:fs/promises";
import { parseFile } from "./tide-parser.mjs";

// 釣り場データ(lib/spots.ts)の tideStation と揃えること
const STATIONS = ["AM", "AK", "OS", "KB", "TN", "Z9", "SI", "MZ", "J5", "J2", "IO"];
const OUT_DIR = new URL("../public/data/tides/", import.meta.url);

const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
const year = now.getUTCFullYear();
const years = [year, year + 1];

await mkdir(OUT_DIR, { recursive: true });

let ok = 0;
for (const code of STATIONS) {
  for (const y of years) {
    const url = `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${y}/${code}.txt`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "FishingBaseJapan/0.1 (+contact via site)" } });
      if (!res.ok) {
        console.warn(`[tides] ${code} ${y}: HTTP ${res.status}（未公開の年は正常）`);
        continue;
      }
      const days = parseFile(await res.text());
      if (days.length < 300) {
        console.warn(`[tides] ${code} ${y}: 行数が少ないため保存しません (${days.length})`);
        continue;
      }
      const data = {
        station: code,
        year: y,
        source: "気象庁ホームページ「潮位表」",
        sourceUrl: url,
        days: days.map(({ date, hourly, high, low }) => ({ date, hourly, high, low })),
      };
      await writeFile(new URL(`${code}-${y}.json`, OUT_DIR), JSON.stringify(data));
      ok++;
      console.log(`[tides] ${code} ${y}: ${days.length}日分を保存`);
    } catch (e) {
      console.warn(`[tides] ${code} ${y}: 取得失敗 ${e?.message ?? e}`);
    }
    await new Promise((r) => setTimeout(r, 500)); // 気象庁サーバーへの負荷を抑える
  }
}
console.log(`[tides] 完了: ${ok}ファイル`);
