import getSbiAccountJpy from './funcs/getSbiAccountJpy';
import getSbiAccountUsd from './funcs/getSbiAccountUsd';
import getSbiTradingLogJpy from './funcs/getSbiTradingLogJpy';
import getSbiIdeco from './funcs/getSbiIdeco';

export default {
	async fetch(request, env, ctx) {
		// リクエストパスを取得
		const url = new URL(request.url);
		const path = url.pathname;

		// クエリからトークンを取得して検証、不正な場合は401を返す
		const token = url.searchParams.get('token');
		if (token !== env.API_TOKEN) {
			return new Response('Unauthorized', { status: 401 });
		}

		// json のレスポンスオプションの宣言
		const jsonOption = { headers: { 'Content-Type': 'application/json' } };

		switch (path) {
			case '/sbiAccountJpy':
				const sbiAccountJpy = await getSbiAccountJpy(env);
				return new Response(JSON.stringify(sbiAccountJpy), jsonOption);

			case '/getSbiTradingLogJpy':
				const sbiTradingLogJpy = await getSbiTradingLogJpy(env);
				return new Response(JSON.stringify(sbiTradingLogJpy), jsonOption);

			case '/sbiAccountUsd':
				const sbiAccountUsd = await getSbiAccountUsd(env);
				return new Response(JSON.stringify(sbiAccountUsd), jsonOption);

			case '/getSbiIdeco':
				const sbiIdeco = await getSbiIdeco(env);
				return new Response(JSON.stringify(sbiIdeco), jsonOption);

			case '/getSbiAllJpy':
				const _sbiAccountJpy = await getSbiAccountJpy(env);
				const _sbiTradingLogJpy = await getSbiTradingLogJpy(env);
				const sbiAllJpy = Object.assign({}, _sbiAccountJpy, _sbiTradingLogJpy);
				return new Response(JSON.stringify(sbiAllJpy), jsonOption);

			case '/getSbiAllUsd':
				// それぞれの配列を取得・結合し、各行の配列の長さをそろえる
				const _sbiAccountUsd = await getSbiAccountUsd(env);
				const _sbiIdeco = await getSbiIdeco(env);
				const maxLengthDash = Math.max(_sbiAccountUsd[0].length, _sbiIdeco[0].length);
				const sbiAllUsdArray = _sbiAccountUsd.concat([[]]).concat(_sbiIdeco);
				for (let i = 0; i < sbiAllUsdArray.length; i++) {
					const rowLength = sbiAllUsdArray[i].length;
					if (rowLength < maxLengthDash) {
						for (let j = 0; j < maxLengthDash - rowLength; j++) {
							sbiAllUsdArray[i].push('');
						}
					}
				}
				return new Response(JSON.stringify(sbiAllUsdArray), jsonOption);

			default:
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
							<li><a href="/getSbiAllJpy?token=${env.API_TOKEN}">/getSbiAllJpy</a>: SBI証券の円建口座、外貨建口座、取引履歴を取得</li>
							<li><a href="/getSbiAllUsd?token=${env.API_TOKEN}">/getSbiAllUsd</a>: SBI証券の外貨建口座、iDeCo情報を取得</li>
							<li><a href="/sbiAccountJpy?token=${env.API_TOKEN}">/sbiAccountJpy</a>: SBI証券の円建口座情報を取得</li>
							<li><a href="/getSbiTradingLogJpy?token=${env.API_TOKEN}">/getSbiTradingLogJpy</a>: SBI証券の円建取引履歴を取得</li>
							<li><a href="/sbiAccountUsd?token=${env.API_TOKEN}">/sbiAccountUsd</a>: SBI証券の外貨建口座情報を取得</li>
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
