# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

**魚の色は 3D モデルのまま（2026-11-22 オーナー）**：魚の色を水中の見え方に加工しない。色の見え方が主題の回だけ加工あり。くわしくは cg-video-plan.md の共通ルール。

## 作りかけ：【CG実験】船の仕掛けはどう沈む？ オモリの重さと潮の速さ・二枚潮（slug: cg-nimaishio、接頭辞 nk_）
- 2026-11-27 開始（定期タスク 9:23）。A-1 の 5（波動）は cg-oto の「側線」の章と事実が重なるので飛ばし、6 を選んだ。
- [x] 事実の確認（fish-knowledge.md「船の仕掛けの沈み方」）
- [x] main.js に nk_* と nk_thumb（糸は新しい nkSim：鎖のモデル。FT_BODY は使わない）
- [x] 台本 cg-nimaishio.json・ショート short-cg-nimaishio.json、Blender の場面 scenes/nimai.py（check_scene 0.542m）
- [x] ローカルの静止画の確認（--clear 最小 1.27m）
- [ ] cg-video（書き出し）→ cg-compress → Blender test → full
- [ ] ORDER に入れる・固定コメント・企画リストの更新

次にやること：一番上の [ ] から。

---

## 作りかけ（アカデミー）R12 カツオは昼も夜も浅い？ 浮魚礁とアーカイバルタグ（slug: cg-katsuo、2026-11-27 開始）
- [x] 企画を選ぶ（A-2 の1番）・fish-knowledge.md の「カツオ（浮魚礁）」の節に抄録と和歌山県の資料を足した
- [x] 台本 content/cg/cg-katsuo.json・short-cg-katsuo.json（本編 約2分45秒・ショート 44.5秒の見積もり）
- [x] main.js に kt_* ショットと kt_thumb（カツオの3Dモデルは Fish Kit にないので、同じサバ科のキハダのモデルを使い、画面に断り書き）
- [x] Blender 場面 scenes/katsuo.py（ENV="fad"：parts.build_fad の係留ロープ。check_scene 最小すきま 2.85m）
- [x] ローカル静止画の確認（横・縦・サムネイル）
- [ ] cg-video（chunks=8）→ cg-compress → Blender test → full
- [ ] ORDER・固定コメント・cg-video-plan.md の更新
- 書き出し cg-video 45935747443（起動ずみ）・Blender test 起動ずみ
次にやること：cg-video の完了を待つ → cg-compress（run_id=45935747443）→ Blender test を確かめる → full

---

（作りかけはなし。2026-11-25 見える化（A4）「堤防の足音・話し声は魚に届く？」cg-oto を ORDER に入れて完了。書き出し 45519622908・圧縮 45522481605・Blender full 45523680707・最小すきま 0.526m）

（作りかけはなし。2026-11-24 アカデミー R11「冬のチヌはノリを食べに来る？」cg-nori を ORDER に入れて完了。書き出し 45329169274（render 3・6・finish が Install で止まり再実行）・圧縮 45338408379・Blender full 45340723375・最小すきま 1.069m）

（作りかけはなし。2026-11-24 見える化「魚からはどこまで見えている？」cg-shikai を ORDER に入れて完了。書き出し 45299045780（render 2 が Install で止まったので取り消して再実行）・圧縮 45307006335・Blender full 45303771457・最小すきま 0.379m）

（作りかけはなし。2026-11-22 アカデミー R15「もしもサワラがいなくなったら？」cg-sawara-moshi を ORDER に入れて完了。書き出し 44986093157・Blender full 44989380244・最小すきま 1.945m）

（作り直しも完了。2026-11-23 cg-nabura：ミノーの向き・ブリが水面から出る場面を直した。書き出し 45075990834・圧縮 45078185593・Blender 差しかえ 45078860731（コマは 44971302967）。long-posts.json から外して、長尺だけ出し直す（オーナー指示。ショートはそのまま）。古い記録は data/sns/long-posts-retired.json）

（作りかけはなし。2026-11-23 見える化「風の日、釣り場はどう変わる？」cg-kaze を ORDER に入れて完了。書き出し 45090512331・圧縮ずみ・Blender full 45093535691・最小すきま 5.233m）

（作りかけはなし。2026-11-23 アカデミー R9「魚にも『昼型』と『夜型』がいる？」cg-hiruyoru を ORDER に入れて完了。書き出し 45113730520・Blender full 45116440276（1台落ちて失敗ジョブだけ再実行）・最小すきま 0.587m）
