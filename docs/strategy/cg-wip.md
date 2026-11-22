# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

**魚の色は 3D モデルのまま（2026-11-22 オーナー）**：魚の色を水中の見え方に加工しない。色の見え方が主題の回だけ加工あり。くわしくは cg-video-plan.md の共通ルール。

---

## 作りかけ（アカデミー）：もしもサワラがいなくなったら？（cg-sawara-moshi、sz_*）2026-11-22 開始
- 企画：A-2 の1番（R15・もしもシリーズ3）。cg-sawara（R6：資源回復）と重ねず、漁獲量の激減（1986年6,255t→1998年196t）・赤ちゃんは魚を食べて育つ（京都大学・瀬戸内海栽培漁業協会）・減った原因・今また親魚が減っているを主役に。
- 事実：fish-knowledge.md の「サワラ（瀬戸内海：…）」「サワラの仔魚」「サワラ（サゴシ）」の節。
- [x] 資料を足す（fish-knowledge.md に「サワラの仔魚」の節）
- [x] 台本 content/cg/cg-sawara-moshi.json・short-cg-sawara-moshi.json
- [x] main.js に sz_* と sz_thumb
- [x] Blender の場面 scenes/sawara.py（aji.py をもとにサワラの群れが散る。check_scene 最小すきま 1.85m）
- [x] 静止画の確認（長尺・サムネ・ショート）→ push
- [ ] cg-video（chunks=8）→ cg-compress
- [ ] cg-blender-open test → full
- [ ] ORDER・固定コメント・cg-video-plan.md の制作済みへ
- cg-video：run 44986093157（起動ずみ）。固定コメント data/sns/yt-comments/cg-sawara-moshi.txt 作成ずみ
- [x] cg-video 44986093157（3分52秒）→ cg-compress 44988342943 → Blender test 44988345114（最小すきま 1.96m、冒頭の章 11.5秒 ≦ SEC 12）
- Blender full：run 44989380244（起動ずみ）
- 次にやること：Blender full の完了を待つ → 確かめて ORDER へ
