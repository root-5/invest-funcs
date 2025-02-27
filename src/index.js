import getSbiAccountJPY from './funcs/getSbiAccountJPY';
import getSbiAccountUSD from './funcs/getSbiAccountUSD';
import getSbiTradingLogJPY from './funcs/getSbiTradingLogJPY';
import getSbiIdeco from './funcs/getSbiIdeco';

export default {
	async fetch(request, env, ctx) {
		// リクエストパスを取得
		const url = new URL(request.url);
		const path = url.pathname;

		// クエリからトークンを取得
		const token = url.searchParams.get('token');

		// トークンが正しいか確認
		if (token !== env.API_TOKEN) {
			return new Response('Unauthorized', { status: 401 });
		}

		switch (path) {
			case '/sbiAccountJPY':
				const sbiAccountJPY = await getSbiAccountJPY(env);
				return new Response(sbiAccountJPY);
			case '/sbiAccountUSD':
				const sbiAccountUSD = await getSbiAccountUSD(env);
				return new Response(sbiAccountUSD);
			case '/getSbiTradingLogJPY':
				const sbiTradingLogJPY = await getSbiTradingLogJPY(env);
				return new Response(sbiTradingLogJPY);
			case '/getSbiIdeco':
				const sbiIdeco = await getSbiIdeco(env);
				return new Response(sbiIdeco);
			default:
				// return new Response("Not Found", { status: 404 });
				return new Response(
					`
					<!DOCTYPE html>
					<html lang="ja">
					<head>
						<meta charset="UTF-8">
						<title>仕様メモ</title>
					</head>
					<body>
						<h1>仕様メモ</h1>
						<ul>
							<li><a href="/sbiAccountJPY?token=${env.API_TOKEN}">/sbiAccountJPY</a>: SBI証券の円建口座情報を取得</li>
							<li><a href="/sbiAccountUSD?token=${env.API_TOKEN}">/sbiAccountUSD</a>: SBI証券の外貨建口座情報を取得</li>
							<li><a href="/getSbiTradingLogJPY?token=${env.API_TOKEN}">/getSbiTradingLogJPY</a>: SBI証券の円建取引履歴を取得</li>
							<li><a href="/getSbiIdeco?token=${env.API_TOKEN}">/getSbiIdeco</a>: SBI証券のiDeCo情報を取得</li>
						</ul>
					</body>
					</html>
					`,
					{ headers: { 'Content-Type': 'text/html' } }
				);
		}
	},
};
