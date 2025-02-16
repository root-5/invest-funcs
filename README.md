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
- Hono を使って再構築
- 