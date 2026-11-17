# 3DCG 動画：作りかけの引き継ぎメモ

**どの回のセッションでも、3DCG の作業を始める前にこのファイルを読む。** 作りかけがあれば、新しい企画を選ばずに「次にやること」から続ける。
作業が1つ進むたびに、このファイルのチェックを更新して commit・push する（利用上限で止まっても、別のモデル・別のセッションが続きから再開できるようにするため。2026-11-16 オーナー依頼）。

使い回せる部品の一覧は docs/strategy/cg-assets.md。

---

## 作りかけ 1：船のメバル（cg-fune-mebaru）

- 依頼：2026-11-16 オーナー「メバルの動画を作成して。Blender も用いて、クオリティーの高い動画に。使い回せる素材も作っておく」
- 企画：【見える化】船のメバル、群れはどこに浮いている？（船釣り 見える化シリーズ 第4回）。cg-video-plan.md の「季節待ち」から前倒し。
- slug：長尺 `cg-fune-mebaru`、ショート `short-cg-fune-mebaru`
- main.js の接頭辞：`mb_`（場面）、共通の部品は `ne*`（根・海藻）と `sb*`（サビキ・胴付き仕掛け）
- Blender の場面：`scripts/cg/blender/scenes/mebaru.py`（環境 `ENV = "reef"`、仕掛け `LURE = "sabiki"`）

### 確かめた事実（これ以外は言わない）
出典は docs/research/fish-knowledge.md の「船のメバル（釣り方）」の節にも書く。
- TSURI HACK「元釣具屋が船メバルサビキを語る」 https://tsurihack.com/4811
  - 冬から春が盛り（メバルは冬場がハイシーズン）。狙うタナは底付近がほとんど。
  - サビキは鈎4〜6号・ハリス0.8号・5〜6本針がオールラウンド。食い渋りは0.6号以下。PE0.8号前後。
  - 警戒心が強く、ストンとオモリを落とすと逃げる → オモリは「そっと置くように」。着底前にブレーキ。
  - 着底したらすぐ1mほど巻いて底を切る。竿をゆっくり上げ下げ。すべての動作をゆっくり、サビキがフワフワ漂うように。
  - アタリが多いのは竿をゆっくり上げている時。アワセは不要、そのままゆっくり巻く。
  - 掛かってもゆっくり巻く → 連掛け。（「吐いたエサが撒きエサになる」は使わない：確かな裏づけがない）
  - 根掛かりが多いので仕掛けは多めに。
- ダイワ「メバル・カサゴ（胴付き）」 https://www.daiwa.com/jp/beginner/place/mebaru_kasago_doutuki
  - メバルは視力が良い → 細ハリス。根周り・岩礁帯の上・海草の周辺。群れを作って活発に動くので、底だけでなく数m上まで探る（ベタ底にこだわらない）。
  - 船は潮で流されるので、マメに底を取り直す（それ自体が誘いになる）。オモリが頻繁に当たる＝かけあがり、当たらなくなった＝下がっている → 落とし込む。
  - 底を取ってから 50cm〜1m 巻き上げて様子を見る。オモリは10〜20個用意。
- 週刊つりニュース「船から狙うメバル釣り3種」 https://tsurinews.jp/8353/
  - サビキ：3m前後の竿。タナは底から1〜2m、時には5m上まで。シラスを食べているメバルは中層まで浮くことが多い。向こうアワセでよい。
  - 動くものに積極的に反応する。仕掛けを動かし続けると次々に飛びつくことがある（多点掛け）。寒い季節なので防寒。
- 釣りの記事（明石のメバルサビキ） https://j-fishingdiary.com/akashi_hune-mebarusabiki/ ：瀬戸内で冬から春、仕掛け全長3m前後、オモリ20号・30号、合わせは厳禁、ゆっくり巻いて追い食い。
- シマノ「メバルの特徴と釣り方」 https://fish.shimano.com/ja-JP/content/beginners/fish/mebaru/index.html ：アカ・クロ・シロの3種の総称、夜行性で目が大きい。
- **言わないこと**：関西の解禁日・具体的な月（船宿で違う。「冬から春」とだけ言う）、「メバルは凪を釣れ」「上を見ている」（今回の出典にない）、水深の数値（絵は「例えば水深30m」とする）、計算で出た速さ。

### 構成（長尺 約3分〜3分半）
1. `mb_hook` つかみ（Blender に差しかえ）
2. `mb_where` 根の上に浮く群れ（タナ：底から1〜2m、ときに5m）
3. `mb_rig` サビキ仕掛け（5〜6本針・細ハリス・長い竿・オモリ20〜30号）
4. `mb_fall` 底取り：そっと置く → すぐ1m巻いて底を切る（ftSim で計算）
5. `mb_ne` 根の起伏：船が流れるので底を取り直す（模式図）
6. `mb_sasoi` 誘い：ゆっくり上げ下げ（ftSim）
7. `mb_quiz` アタリが来たら？ → 合わせない・ゆっくり巻く
8. `mb_oigui` 追い食い（連掛け）
9. `mb_safe` 根掛かり・船長の指示・ライフジャケット・防寒
10. `mb_sum`・`ask`・`end`

### 進み具合（終わったら [x] にして push）
- [x] 0. 事実の確認・構成（このファイル）
- [x] 1. main.js：根と海藻（ne*）、サビキ仕掛け（sb*）、メバルの群れ、`mb_*` の場面、`mb_thumb`
- [x] 2. 台本 content/cg/cg-fune-mebaru.json（blender_open・thumb_shot 入り）と short-cg-fune-mebaru.json
- [x] 3. narrate.py --silent → render_cg.py --stills / --thumb / --portrait --stills を全部見て直す。魚のすきま（window.__ftClear 0.3m 以上）
- [x] 4. Blender：opening.py に ENV="reef"（根・海藻）と LURE="sabiki" を足す、scenes/mebaru.py。bpy なしで式だけ確かめる
- [x] 5.（1回目は確認ずみ。見た目を直して2回目を実行中）push → cg-blender-open.yml を mode=test（video_run は何でもよい）→ long-media の cg/open/test/cg-fune-mebaru/ の絵を見て直す
- [x] 6.（cg-video 43832760823・cg-compress 43835214218 とも成功。長さ 3分04秒。書き出した動画を数コマ見て確認ずみ）cg-video.yml（slug=cg-fune-mebaru, chunks=8）→ cg-compress.yml（run_id, slug）
- [x] 7.（43836340256 成功：240コマ、魚のすきま最小 0.572m、冒頭とサムネイルを差しかえずみ）cg-blender-open.yml mode=full, samples=64, video_run=<6 の実行ID> → cg/open/cg-fune-mebaru-check-*.jpg と summary（すきま 0.2m 以上）
- [x] 8. 固定コメントの道具紹介 data/sns/yt-comments/cg-fune-mebaru.txt（ASIN を確かめる）
- [x] 9.（11/16 追加。cg-surf の次）yt_long.py の ORDER に入れる → **投稿日はオーナーに確かめる**（今回は定期タスクではなくオーナーとの会話から作っている）
- [ ] 10. cg-short.yml（slugs=short-cg-fune-mebaru, publish=true）は長尺の投稿と同じ日に
  - 2026-11-17：長尺は 11/17 0:25 に投稿済み。ショートと 11 の後片づけは、11/17 18:50 の予約タスク「メバルの長尺が出たか確認・ショート投稿」がやる。**ほかの制作タスクはメバルのショートを出さない**（二重投稿になる）。メバルを理由に新しい企画を止めない。
- [ ] 11. cg-video-plan.md の「制作済み」へ移し、このファイルの「作りかけ 1」を消す

### 次にやること
11/17 18:17 の枠で長尺が出たら（data/sns/long-posts.json に cg-fune-mebaru が入ったら）：10 → cg-short.yml（slugs=short-cg-fune-mebaru, publish=true）→ 固定コメント（data/sns/yt-comments/cg-fune-mebaru.txt）の文面をオーナーに渡す → 11。18:17 の定時実行が GitHub 側で起動しないことがある（11/16 に起きた）ので、18:50 に出ていなければ long-upload.yml を slug=cg-fune-mebaru で手動実行してよい（オーナーが 11/17 に出すと決めている）。

### 実行の記録（実行 ID など）
- 2026-11-16 17:31 cg-blender-open（test）43831943344（失敗：頂点の取り方のエラーと Blender の取得 403。直した）→ 17:37 43832757090（成功）
- 2026-11-16 17:37 cg-video（slug=cg-fune-mebaru, chunks=8）実行 ID 43832760823
- 2026-11-16 17:52 cg-blender-open（test 2回目）43834611374 成功：根が岩らしくなり、サムネイルもよい
- 2026-11-16 18:10 cg-blender-open（full）43836340256
- 固定コメント：data/sns/yt-comments/cg-fune-mebaru.txt（作成ずみ）
- 確認ずみ：`render_cg.py cg-fune-mebaru --clear` 最小 0.75m、`check_scene.py mebaru` 最小 0.59m、長さ 約2分55秒

---

## 作りかけ（アカデミー）：海の中で赤は消える？（cg-akai）

- 定期タスク「ツレドキアカデミーの制作」2026-11-17 開始。A-2 の1番（R10）。
- slug：長尺 `cg-akai`、ショート `short-cg-akai`。main.js の接頭辞 `rc_`。Blender の場面 `scenes/akai.py`（マダイと赤いタイラバ、うしろに遠いマダイの群れ）
- 事実は fish-knowledge.md の「水中の光と色」「魚の視覚」の節だけ（11/17 に Australian Museum・NOAA の本文を再確認）。Webb の教科書（オレンジ40m など）は公的機関でないので使わない。
- 構成：rc_hook（Blender）→ rc_absorb（水は赤を吸う・届く順）→ rc_depth（深さの目安：赤とオレンジ約10m、150mで青だけ、800mで暗い）→ rc_quiz（100mの赤いマダイは何色？）→ rc_nigori（透明度・濁り）→ rc_eye（魚の目は人とちがう）→ rc_lure（ルアーの色の研究）→ rc_tsuri（釣りへ）→ rc_sum・ask・end

### 進み具合
- [x] 0. 企画・事実・構成
- [x] 1. main.js：rc_* と rc_thumb
- [x] 2. 台本 cg-akai.json（約3分09秒）・short-cg-akai.json（約46秒）
- [x] 3. ローカルの静止画確認（横・縦・サムネ）。海底のない場面なので砂に埋まる心配はなし
- [x] 4. Blender：scenes/akai.py と check_scene（最小 0.618m）
- [ ] 5. cg-video 43990002628 成功 → cg-compress 43992030545
- [ ] 6. cg-blender-open test 43990111018 成功（すきま 0.614m）→ サムネの位置を直して test 2回目 43992033659 → full
- [ ] 7. ORDER・固定コメント・制作済みへ移す
