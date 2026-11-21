# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

---

## 作りかけ（アカデミー）：もしもアジがいなくなったら？（R14・もしもシリーズ2）cg-aji（2026-11-21 開始、アカデミーの定期タスク）
- 接頭辞 aj_（main.js）。Blender の場面 aji（scripts/cg/blender/scenes/aji.py、iwashi.py をもとにアジの群れ）
- 事実は fish-knowledge.md「マアジ」（2026-11-21 追記：2026年度資源評価・茨城県・長崎県・広田・道総研）
- [x] 資料調べ・fish-knowledge.md に追記
- [x] main.js に aj_* と aj_thumb
- [x] content/cg/cg-aji.json・short-cg-aji.json
- [x] Blender の場面 aji.py（式だけで魚のすきまを確認：最小 0.73m）
- [x] ローカルで静止画の確認（長尺・サムネイル・ショート）→ push
- [x] cg-video（chunks=8）→ 実行ID：44845219379（成功）
- [x] cg-compress → long-media を確認（cg-aji.mp4.part-00・jpg・chapters）
- [ ] cg-blender-open test（44849081295、OK・最小すきま 0.997m）→ full 44851817112（11/21 10:43 起動）→ summary 確認
- [ ] ORDER に入れる・固定コメント data/sns/yt-comments/cg-aji.txt
- [ ] cg-video-plan.md の制作済みへ移す・この節を消す
- 次にやること：Blender full 44851817112 の完了を待ち、cg/open/cg-aji-summary.txt と check 画像を確かめる → ORDER に cg-aji を入れる（固定コメント data/sns/yt-comments/cg-aji.txt は作成済み）
