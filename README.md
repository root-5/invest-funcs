# invest-funcs
投資に使えるかもしれない簡易的な関数を Cloudflare Wokers で提供させる試み。
Cloudflare Wokers の所感としては、導入～デプロイまでがマネージドとなっていて他ライブラリが不要なため、かなり使いやすい。

## 注意
一部スクレイピングのコードが含まれますが、これらはサーバー負荷をかけることは目的としていません。
また、スクレイピングのコードはサイトの利用規約に違反する可能性があるため、自己責任でご利用ください。

# コマンド
## リポジトリ作成時に実行
1. `npm create cloudflare@latest -- invest-funcs`
2. `npm run deploy`

## 開発中使用
- デプロイ: `npm run deploy`
- ローカル起動: `npm run dev`

# アイディア
- 簡易的な認証として永続トークンを使っているが、脆弱の極みなので一時トークンに変更する
- Wokers KV を使って ssoToken などの一時データを保存し、id, pass の送信回数を減らす
  - https://developers.cloudflare.com/kv/get-started/
- 外貨口座はあまり使っていないため、レスポンスの解析が不十分
- Hono を使って再構築
- CI/CD を導入（現時点でも `npm run deploy` だけなので優先度は低い）
