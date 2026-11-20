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

- [x] main.js の iw_*・iw_thumb
- [x] 台本 cg-iwashi.json・short-cg-iwashi.json、narrate の読み
- [x] Blender の場面 iwashi.py（check_scene：最小すきま 1.05m。カメラとの最小距離 1.1m）
- [x] ローカルで静止画の確認
- [ ] cg-video（8分割）→ cg-compress
- [ ] cg-blender-open test → full
- [ ] ORDER・固定コメント・企画リストの更新

## 作りかけ（3DCG）：漁港のスロープ、どこに投げる？（cg-slope、sl_*）2026-11-20 開始
A-1 の1番。土台は漁港のスロープの断面（spBase・spBed・SP_PINS）。Blender は新しい場面 slope（段差のすその捨て石とカサゴ、ワーム）。
確かめた事実（docs/research/fish-knowledge.md「漁港のスロープ」に書く）：TSURI HACK 5346（静かな所で海藻・貝が付きエビ・カニが集まる／切れ目に捨て石が入ることが多く住処／切れ目から一気に深くなる＝かけあがり、深場が隠れ家・浅場が餌場でロックフィッシュが居着く／ブレイクまで投げてズル引き・リフト＆フォール／とても滑りやすい／本来は船着き場、漁師さんの迷惑にならない）、TSURI HACK 3182（内湾のスロープ付近はフィッシュイーターが小魚を追い詰めやすい・アジング等）、BE-PAL 232786（常夜灯の明暗の境目・アジ・メバル・釣り禁止の看板・ライフジャケット）、第九管区（立入禁止区域に入らない・海中転落が多い）
- [x] 資料を fish-knowledge.md に書く
- [x] main.js sl_*・Blender scenes/slope.py（check_scene 最小すきま 0.258m）
- [x] 台本 cg-slope.json・short-cg-slope.json、静止画の確認（--clear 0.3m）
- [x] cg-video（slug=cg-slope）→ 実行ID：44667334487（成功）
- [ ] cg-compress
- [ ] cg-blender-open test（44669303463）→ full（実行ID：）
- [ ] ORDER・固定コメント・plan 更新

