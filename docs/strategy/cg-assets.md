# 3DCG 動画：使い回せる部品の一覧

新しい動画を作るときは、まずここから選ぶ。部品を足したら、この表に1行足す（2026-11-16 オーナー：「使い回せる素材を作っておくと、制作時間を減らせる」）。
作りかけの動画の引き継ぎは docs/strategy/cg-wip.md。

## 1. three.js（scripts/cg/main.js）：解説の場面

| 部品 | 呼び方 | 中身・使いどころ |
|---|---|---|
| 海の断面と船 | `ftBase()`、`ftBoat`、`ftRodSet`、`ftOthers`、`ftWide`、`ftCam` | 海面・空・砂の底（水深70m）・遊漁船・釣り人・竿。船釣りの回の土台 |
| 仕掛けの動きの計算 | `ftControl`・`ftSim`・`ftRun(name)`、`FT_BODY`・`FT_SEQ` | 重さ・浮力・水の抵抗・糸の張りの2次元モデル。操作の列（free・reel・jerk・wait・mark・fish）を書くと動きが出る。`opt.botf(x, t)` で場所・時刻で変わる海底も入る |
| **根（岩礁）と海藻** | `rfBase()`、`rfH(x)`・`rfY(x)`・`rfY3(x, z)`、`RF_HILLS`、`rfKelp`、`rfClear(gap)` | 砂の底を水深30m（`RF_BOT`）にして、岩の山と海藻を出す。`RF_HILLS`（[中心, 幅, 高さ]）を変えると地形が変わる。`opt.botf: (x) => rfY(x)` で ftSim の底になる。船のカサゴ・アジ・根魚、堤防の根まわりの回に |
| **サビキ・胴付き仕掛け** | `sbPlace(T, S, tip, vel, o)`、`sbRigAt`、`sbRig(T, sim, ts, o)`、`FT_BODY.omori30`、`SB_POS` | オモリ（ナス型30号）・幹糸・枝（ハリス）・ハリ・魚の皮・ビーズ。`o.n` でハリの数、`o.vis` で拡大、`o.hooked` で魚が掛かったハリ。`sbRig` の戻り値は `ftCtl` にそのまま渡せる。船のアジ・イワシのサビキ、胴付きのカサゴ・カワハギにも |
| **メバルの群れ・食いつく魚** | `mbAt(i, mx, my, ang, T, o)`、`mbSchool(T, o)`、`mbBiter(i, hk, dt, T, o)`、`mbKasago` | Fish Kit の魚を「口の位置と頭の向き」で置く（`o.id` でほかの魚種にも使える）。根より 0.3m 以上、上に自動で上げる。`mbBiter` は「待つ → 0.7秒前から寄る → 掛かって体を振る」 |
| 船が流れる場面（模式図） | `MB_DRIFT.at(t)`・`MB_DRIFT.ev` | 底から約1mを保ち、当たったら巻き、5秒ごとに取り直す動きを前もって作ったもの |
| タナの帯・全体図・グラフ | `mbBand(x0, x1, lo, hi, a, 濃さ)`、`mbMini(sx, sy, bx)`、`mbGraph(sim, ts, win)` | 根の形に沿った緑の帯、根の入った全体図（水深30m）、底からの高さのグラフ |
| 画面の部品 | `ftMini`・`ftCtl`（竿とリール）・`ftGraph`・`agGraph`・`ftChip`・`ftNote`・`ftCard`・`ftFinder`・`ftThumbText`、`label`・`legend`・`bigText`・`card`・`drawBar` | 左上の全体図、右上の竿とリール、字幕チップ、注記など |
| 魚（Fish Kit） | `fkGet(id, i, cm)`・`fkPlace(f, 位置, 向き, 頭の上げ角, T)`、`endFish` | 写真から作った魚20種。読み込む種類は `loadFish` の配列に足す（今：tachiuo, buri, madai, aji, saba, katakuchi, sawara, magochi, mebaru, kasago） |
| イカ（Squid Kit） | `loadSquids`・`createSquid` | アオリイカ・コウイカ（cg-video-plan.md の注意を読む） |
| ルアー・仕掛けの模型 | `ftTenya`、`makeJigReal`、`trRig`（タイラバ）、`sfJig` | テンヤ・メタルジグ・タイラバ |
| サーフ | `sfBed`・`sfBase`・`sfRig`・`sfTopView` など | 砂浜の断面と上からの絵（離岸流） |

## 2. Blender（scripts/cg/blender/）：冒頭とサムネイル

| 部品 | 場所 | 中身・使いどころ |
|---|---|---|
| 共通の海・光・砂・魚・カメラ | `opening.py` | 水の散乱と光の筋、砂、マリンスノー、Fish Kit の魚（主役と群れ）、カメラ。場面の `LURE`・`ENV` で切りかえる |
| **根（岩礁）** | `parts.build_reef(hfn, mat)` | 高さの式 `reef_h(x, y)` から岩の地形を作る。場面に `ENV = "reef"` と `reef_h` を書くだけ |
| **海藻** | `parts.Kelp`・`parts.kelp_roots(hfn, keep_out=...)` | 根の上に帯の葉を生やし、毎コマゆらす。`kelp_keep_out(x, y)` で魚の通り道をあける |
| **サビキ仕掛け** | `parts.Sabiki`（場面に `LURE = "sabiki"`・`N_HOOK`・`rig(t)`） | オモリ・幹糸・ハリス・ハリ・魚の皮・ビーズ。`rig(t)` が（オモリの上の端, [(結び目, ハリスの先)]）を返す |
| タイラバ・メタルジグ | `opening.py` の `place_lure`・`place_jig`（`LURE = "tairaba"` / `"jig"`） | |
| 場面 | `scenes/tairaba.py`（マダイ）、`scenes/jig.py`（ブリと群れ）、`scenes/surf.py`（マゴチ）、`scenes/mebaru.py`（メバルの群れ・根・サビキ） | 動きは時刻 t だけの式。新しい場面はいちばん近いものをコピーして作る |
| 題とサムネイルの文字 | `apply_opening.py` | 冒頭の章を差しかえ、題を重ね、サムネイルを作る |

### 書き出し済みの映像（long-media ブランチ。`blender_open.clip` にパスを書くと、書き出さずにそのまま使える）
| 映像 | パス | 中身 |
|---|---|---|
| タイラバとマダイ | `cg/open/cg-fune-tairaba-open.mp4` | 10秒 |
| ジグとブリ | `cg/open/cg-fune-aomono-open.mp4` | 13秒 |
| サーフのジグとマゴチ | `cg/open/cg-surf-open.mp4` | 11秒 |
| 根の上のメバルとサビキ | `cg/open/cg-fune-mebaru-open.mp4`（full の書き出しが終わるとできる） | 10秒。根魚・メバルの回、ショートの頭、長尺のアイキャッチに使える |

文字のないサムネイル用の絵は `cg/open/<slug>-thumb.png`。

## 3. 確かめる道具

| 道具 | 使い方 | 何を確かめるか |
|---|---|---|
| 静止画 | `python3 scripts/cg/render_cg.py <slug> --stills`（縦は `--portrait`）、`--at 秒,秒`、`--thumb` | 画面の重なり・はみ出し |
| **魚と海底のすきま** | `python3 scripts/cg/render_cg.py <slug> --clear` | 0.4秒おきに全編を見て、場面ごとの最小のすきまを出す（0.3m 以上） |
| **並べて見る** | `sh scripts/cg/tools/sheet.sh out.jpg a.jpg b.jpg c.jpg d.jpg` | 静止画4枚を1枚に（確認の手間と読む量を減らす） |
| **仕掛けの計算** | `node scripts/cg/tools/sim_check.mjs <FT_SEQ の名前>…` | ブラウザなしで、底からの高さ・糸の張り・着底の時刻・印を出す |
| **Blender の式** | `python3 scripts/cg/blender/check_scene.py <scene>` | Blender なしで、全コマの式・魚と根のすきま（0.2m 以上）・食う前に突き抜けないこと |
| Blender の試し書き出し | `cg-blender-open.yml`（mode=test。video_run は何でもよい） | 6コマとサムネイルを低画質で。long-media の `cg/open/test/<slug>/` |

## 4. 新しい回を作るときの近道（船釣り・根まわり）
1. cg-wip.md に「作りかけ」を書く（slug・構成・確かめた事実）。
2. main.js：`rfBase()`（根）か `ftBase()`（砂）を土台に、仕掛けは `FT_BODY`・`FT_SEQ` に足して `sim_check.mjs` で確かめる。魚は `mbAt` の `o.id` を変えて置く。
3. 台本は content/cg/cg-fune-mebaru.json をコピーして直す。ショートは short-cg-fune-mebaru.json。
4. Blender：`scenes/mebaru.py` をコピーして魚（`FISH`）と動きを変える。`check_scene.py` → `cg-blender-open.yml` の test。
5. `--stills`・`--clear` → cg-video → cg-blender-open（full）→ 投稿。
