# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

---

## 作りかけ：【見える化】テトラ帯、どこに投げる？（slug: cg-tetra、接頭辞 tp_、2026-11-18 開始）
- 企画：A-1 の1番。釣り人は防波堤の上（テトラに乗らない）。部品はテトラ帯の断面 ttBase・ttY・TT_HOLES・TT_PINS。
- 構成：つかみ（tp_hook）→ テトラのすき間は魚の隠れ家（tp_sec）→ 3つの場所 穴・際・沖の砂地（tp_three）→ クイズ：防波堤の上から投げるなら？答え＝際（tp_quiz）→ なぜ際？（tp_why）→ ワームの引き方・根がかり（tp_lure、ftSim）→ まずめは浮く（tp_mazume）→ 安全（tp_safe）→ まとめ・ask・end
- 事実（fish-knowledge.md の「テトラ帯」に書く）：TSURI HACK 穴釣り（障害物に身を隠す習性・カサゴ・メバル・アイナメ・テトラの上は非常に滑りやすい・人が乗ることを想定していない）、シマノ ロックフィッシュ（消波ブロックは隠れ家・底まで沈めてズル引きやリフト&フォール・掛かると岩穴に逃げ込むので巻いて底から離す）、シマノ チヌ（テトラ周りの前打ち）、BE-PAL（根魚は昼は底に隠れ近くを通る小魚を食べる・まずめは中層や表層まで上がる）、第二管区海上保安本部（消波ブロックのすきまに転落すると救助が難しく命に関わる）
### チェック
- [x] 事実を fish-knowledge.md に追記
- [x] main.js に tp_* と tp_thumb（ワームの計算 FT_SEQ.tp_main・tp_hit、山のすそのテトラ tpFoot）
- [x] 台本 cg-tetra.json・short-cg-tetra.json
- [x] Blender の場面 scenes/tetra.py（check_scene.py OK：砂から最小0.26m・テトラから0.33m以上）。parts.build_tetra・opening.py の JIG_MAT="worm" を追加
- [x] 静止画・--clear の確認（最小0.30m）→ commit・push
- [ ] cg-video（8分割）→ cg-compress　※cg-video 実行 44210799883（11/18 9:48 起動）
- [x] 固定コメント data/sns/yt-comments/cg-tetra.txt・affiliate.py に ASIN
- [ ] cg-blender-open test → full　※test 実行 44210804045
- [ ] ORDER に追加・cg-video-plan.md を更新・この作りかけを消す

