# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

**魚の色は 3D モデルのまま（2026-11-22 オーナー）**：魚の色を水中の見え方に加工しない。色の見え方が主題の回だけ加工あり。くわしくは cg-video-plan.md の共通ルール。

---

## 作りかけ：cg-nabura（3DCG・A-1 の1番「船のキャスティング、ナブラを見つけたらどうする？」）2026-11-22 定期タスク
- 接頭辞 nb_。土台：上から見た海（nbSea）＋船、ナブラ（boil・splash・birds を流用）、水の中（rcBase＋カタクチイワシの群れ・ブリ・サワラ。色の加工なし）、横の断面（ftBase）でルアーの動きを ftSim（nbMinnow＝ジャークベイト、nbJig＝キャスティングのジグ）。
- 事実（docs/research/fish-knowledge.md「船のキャスティング（ナブラ）」）：海上保安庁サイト掲載 小野信昭「ブリ釣り」（静かに・届く位置まで・ナブラ付近に着水・小魚が逃げまどう動き・一斉に突進すると危険でナブラが消える・先に向かう船がいたら譲る・引き波でカヤック/SUP）、シマノ（サワラ：秋〜冬・ボイルの瞬間に撃ち込む・ジャークベイトは止めた瞬間・ボイルがなければカウントダウンして高速巻き／ヒラマサ：鳥が多くても反応しないことも）。「進む先に投げる」は使わない（cg-shokumotsu と重ねない・資料なし）。
- [x] main.js（nb_*・nb_thumb・FT_BODY.nbMinnow/nbJig・FT_SEQ nb_jerk/nb_bite/nb_sink）
- [x] 台本 content/cg/cg-nabura.json（約2分55秒）・ショート short-cg-nabura.json（43.6秒）
- [x] Blender の場面 scenes/nabura.py（surf.py をもとに、速巻きのジグを追うブリ・SEC 13.5）・check_scene（すきま 4.8m）
- [x] 静止画の確認・--clear（横・縦）
- [ ] cg-video → cg-compress → cg-blender-open test → full
- [ ] ORDER・固定コメント・cg-video-plan.md
