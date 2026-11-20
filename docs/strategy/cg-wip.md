# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

---

## 作りかけ（アカデミー）：もしもイワシがいなくなったら？（R13・もしもシリーズ1）
- slug：cg-iwashi（ショート short-cg-iwashi）。main.js の接頭辞 iw_。Blender の場面 scenes/iwashi.py（カタクチイワシの群れ。仕掛けなし LURE="none"）
- 事実：docs/research/fish-knowledge.md「もしも〇〇がいなくなったら」シリーズのイワシ（京都府・水産研究・教育機構・谷津ほか 水産海洋研究・西海）とサワラ（水産庁）。「使わないこと」を守る
- 構成：iw_hook（群れが消える・問い）→ iw_food（食べる魚：マアジ・アカカマス・ブリ・タチウオ・サワラ・シイラ）→ iw_quiz（1980年代の漁獲量）→ iw_graph（大きく増え減りする・4か国・数℃と数十〜数百倍）→ iw_genin（原因はひとつではない）→ iw_sawara（実際に餌が減ったら：瀬戸内海のサワラ）→ iw_tsuri → iw_sum → ask → end
- 2026-11-20 開始（在庫の cg-* が0本のため急ぎ）

- [ ] main.js の iw_*・iw_thumb
- [ ] 台本 cg-iwashi.json・short-cg-iwashi.json、narrate の読み
- [ ] Blender の場面 iwashi.py（check_scene）
- [ ] ローカルで静止画の確認
- [ ] cg-video（8分割）→ cg-compress
- [ ] cg-blender-open test → full
- [ ] ORDER・固定コメント・企画リストの更新

