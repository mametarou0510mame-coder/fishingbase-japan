# 「みんなの釣果投稿」を公開する手順（2026-11-08）

仕組み（投稿フォーム app/post・受付 worker/index.ts）はできている。足りないのは Cloudflare 側の設定だけ。

## オーナーがやること（Cloudflare のダッシュボード）
1. Turnstile（スパム対策）
   - 左メニュー「Turnstile」→「ウィジェットを追加」
   - 名前：ツレドキ投稿、ホスト名：tsuredoki-kansai.mametarou0510mame.workers.dev、モード：マネージド
   - 「サイトキー」と「シークレットキー」が出る
2. D1（投稿を保存するデータベース）
   - 「ストレージとデータベース」→「D1」→「データベースを作成」、名前：tsuredoki
   - 「データベースID」が出る
3. Worker の秘密の値
   - 「Workers & Pages」→ tsuredoki-kansai →「設定」→「変数とシークレット」
   - TURNSTILE_SECRET（種類：シークレット）＝ 1 のシークレットキー
   - ADMIN_TOKEN（種類：シークレット）＝ 自分で決めた長い文字列（不適切な投稿を消すときに使う）
4. サイトキーとデータベースIDを Claude に伝える（どちらも公開してよい値）。シークレットキーと ADMIN_TOKEN は伝えない。

## Claude がやること
- wrangler.jsonc に main（worker/index.ts）・assets の binding（ASSETS）・d1_databases（DB）を追加
- lib/site.ts の turnstileSiteKey にサイトキーを入れる
- ブランチでビルド確認 → main に公開 → /post/ から試しに1件投稿し、/api/posts で読めることを確認
- 同じ設定で「要望・問い合わせ」フォーム（/request/）も使えるようになる

## 費用
- Turnstile・D1・Workers とも無料枠で足りる見込み（D1 無料枠：保存5GB、1日の読み取り500万行・書き込み10万行）
