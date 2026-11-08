# ツレドキ オリジナルグッズ

## Tシャツ第1弾（2026-11-08 オーナー決定）
- おもて：右胸ワンポイントに **ブリ＋TSUREDOKI（1色シルエット）**（2026-11-08 変更）
- うしろ：バックプリントに **シンプル案2（枠なし：朝日・水平線・竿・1色のブリ・水しぶき）**（2026-11-08 変更。src/simple.js の S2）
- 色：生成りT（`*-light.png`）と紺T（`*-dark.png`）
- 仕上がりイメージ：`tee-front-back.png`

## 入稿データ（透過PNG）
| ファイル | 大きさ | 使う場所 |
|---|---|---|
| print/back-light.png | 4000×4160 | 生成りTの背中 |
| print/back-dark.png | 4000×4160 | 紺Tの背中 |
| print/A-light.png / A-dark.png | 4000×4320 | 旧バックプリント（景色の枠あり。タオルなどに使える） |
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
