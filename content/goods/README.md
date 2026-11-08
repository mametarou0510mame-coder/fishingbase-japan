# ツレドキ オリジナルグッズ

## Tシャツ第1弾（2026-11-08 オーナー決定）
- おもて：右胸ワンポイントに **ブリ＋TSUREDOKI（1色シルエット）**（2026-11-08 変更）
- うしろ：バックプリントに **シンプル案2（枠なし：朝日・水平線・竿・1色のブリ・水しぶき）**（2026-11-08 変更。src/simple.js の S2）
- 色：生成りT（`*-light.png`）と紺T（`*-dark.png`）
- 仕上がりイメージ：`tee-front-back.png`

## 価格の決め方（オーナー方針 2026-11-09）
- ツレドキの取り分（トリブン）は販売価格の**だいたい1割**。
- そのうえで、**心理的に買いやすい値段**にそろえる（例：6,183円より 6,100円、6,879円より 6,800円。端数より切りのいい値段や、大台の手前）。
- 取り分は 8〜12% の範囲で、切りのいい値段になる額を選ぶ。SUZURI の price（トリブン）は税抜で指定する（販売価格 =（原価＋トリブン）×1.1）。
- Tシャツ（ドライアスレチック）は 2,816円・取り分300円のまま（オーナー判断）。

## 販売中（SUZURI・2026-11-08 公開）
- ドライアスレチックT（United Athle 4.1oz）前プリント「朝日とブリ」取り分300円・2,816円（税込）
  - 明るい色用 material 21327969：https://suzuri.jp/Tsuredoki/21327969/united-athle-4-1oz-dry-athletic-t-shirt-for-shop/m/white
  - ブラック用 material 21327970：https://suzuri.jp/Tsuredoki/21327970/united-athle-4-1oz-dry-athletic-t-shirt-for-shop/m/black
- パーカー（右胸マーク＋背中・取り分約1割）明るい色 6,100円 material 21328445：https://suzuri.jp/Tsuredoki/21328445/hoodie/m/natural／濃い色 6,800円 material 21328447：https://suzuri.jp/Tsuredoki/21328447/hoodie/m/navy
  - 前が無地でも API では前のプリント代がかかるため、右胸マークを入れた（2026-11-08）
- 作り方：.github/workflows/suzuri.yml（items / create / publish）、内容は spec-tee-c2.json（旧デザイン 21327330 / 21327332 は非公開）
- 非公開のまま残っているもの：両面プリントのドライT・ロンT（material 21327259 / 21327264）

## ロンT第1弾（2026-11-08）
- おもて右胸・うしろはTシャツと同じ。左袖（着る人の左腕）に縦書きの TSUREDOKI / FISHING TIME · KANSAI。
- 仕上がりイメージ：`longt-front-back.png`
- 袖プリントは SUZURI のロンTで使えるか未確認。使えない場合は、おもて・うしろだけで出す。

## 入稿データ（透過PNG）
| ファイル | 大きさ | 使う場所 |
|---|---|---|
| print/back-light.png | 4000×4160 | 生成りTの背中 |
| print/back-dark.png | 4000×4160 | 紺Tの背中 |
| print/A-light.png / A-dark.png | 4000×4320 | 旧バックプリント（景色の枠あり。タオルなどに使える） |
| print/sleeve-light.png / sleeve-dark.png | 縦長 | ロンTの左袖 |
| print/chest-light.png | 3600×2040 | 生成りTの右胸 |
| print/chest-dark.png | 3600×2040 | 紺Tの右胸 |
| print/B-light.png | 3000×3000 | ステッカー・キャップ（丸エンブレム） |
| print/B-dark.png | 3000×3000 | 紺地のグッズ用 |

## デザインのルール
- 朝日は淡い黄色の半円だけ。光の筋は入れない（旭日旗に見えないように）。
- ブリ：背は濃い青、腹は銀白、口先から目を通って尾まで黄色い帯、深い二股の黄色い尾。
- 文字はローマ字。TSUREDOKI は **Alfa Slab One**、FISHING TIME · KANSAI は **Bebas Neue**（どちらも SIL Open Font License。fonts/ に同梱、OFL.txt 参照）。2026-11-08 決定。
- 生成りTのブリの帯は白（生成り）。紺Tは黄色。
- 作り直し：`src/` の designs.js（node と playwright で SVG → PNG）。
