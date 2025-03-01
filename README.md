# invest-funcs
投資に使えるかもしれない簡易的な関数を Cloudflare Wokers で提供させる試み。
Cloudflare Wokers の所感としては、導入～デプロイまでがマネージドとなっていて他ライブラリが不要でかなり使いやすい。

## 注意
一部スクレイピングのコードが含まれますが、これらはサーバー負荷をかけることは目的としていません。
また、スクレイピングのコードはサイトの利用規約に違反する可能性があるため、自己責任でご利用ください。

# コマンド
## リポジトリ作成時に実行
1. `npm create cloudflare@latest -- invest-funcs`
2. Workers KV の設定（詳細は https://developers.cloudflare.com/kv/get-started/、以下は簡易メモ）
   1. `npx wrangler kv namespace create KV_BINDING` で namespace を作成（"-" が "_" で作成されるので注意）
   2. `npx wrangler kv namespace list | jq "."` 作成状況を確認
   3. 2.のコマンドされた kv_namespace を `wrangler.jsonc` に追加
   4. `npx wrangler kv key put --binding=KV_BINDING "test" "testtest"` コマンドでのテスト書き込み
   5. `npx wrangler kv key get --binding=KV_BINDING "test"` コマンドでのテスト読み込み
3. `npm run deploy`

## 開発中使用
- デプロイ: `npm run deploy`
- ローカル起動: `npm run dev`
- ローカルビルド: `npx wrangler deploy --dry-run --outdir=./dist`

# Cloudflare Workers 使い方メモ
デプロイした関数の「デプロイ」タブの右上にある「</>」のマークをクリックすると、直接 WEB 上のエディタで編集できる。

# ドキュメント
- [公式の AI サポート](https://developers.cloudflare.com/workers/ai/)
- [KV の使い方](https://developers.cloudflare.com/kv/get-started/)

# アイディア
- 簡易的な認証として永続トークンを使っているが、脆弱の極みなので一時トークンに変更する
- Cloudflare 依存部分を分離
- テストコードを書く
- Hono を使って再構築
- CI/CD を導入（現時点でも `npm run deploy` だけなので優先度は低い）
