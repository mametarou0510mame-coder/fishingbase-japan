# FishingBase Japan

関西の釣果・潮・釣り場情報をまとめる Web サイト（Next.js 静的出力 → Cloudflare Pages）。

## 現在の状態（2026-10-18）

- 公開準備中（全ページ `noindex`）
- ページ：トップ / 運営者情報 / プライバシーポリシー / 利用規約 / 免責事項・安全について / データ削除のご依頼 / お問い合わせ
- `lib/site.ts` の `contactEmail` が未確定（公開前に設定）

## ローカルで動かす

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # out/ に静的ファイルを出力
```

## Cloudflare Pages の設定

| 項目 | 値 |
| --- | --- |
| プロジェクト名 | fishingbase-japan（→ fishingbase-japan.pages.dev） |
| 本番ブランチ | main |
| フレームワーク | Next.js (Static HTML Export) |
| ビルドコマンド | `npx next build` |
| 出力ディレクトリ | `out` |
| 環境変数 | `NODE_VERSION` = `22` |

## 正式公開時にやること

1. `lib/site.ts` の `noindex` を `false` にする
2. 独自ドメインを取得したら `url` を変更し、Cloudflare Pages にカスタムドメインを追加
