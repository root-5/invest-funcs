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

		switch (path) {
			case '/sbiAccountJpy':
				const sbiAccountJpy = await getSbiAccountJpy(env);
				return new Response(sbiAccountJpy);

			case '/sbiAccountUsd':
				const sbiAccountUsd = await getSbiAccountUsd(env);
				return new Response(sbiAccountUsd);

			case '/getSbiTradingLogJpy':
				const sbiTradingLogJpy = await getSbiTradingLogJpy(env);
				return new Response(sbiTradingLogJpy);

			case '/getSbiAllJpy':
				const _sbiAccountJpy = await getSbiAccountJpy(env);
				const _sbiTradingLogJpy = await getSbiTradingLogJpy(env);

				// 各 CSV 形式文字列を二重配列に変換
				const sbiAccountJpyArray = _sbiAccountJpy.split('\n').map((line) => line.split(','));
				const sbiTradingLogJpyArray = _sbiTradingLogJpy.split('\n').map((line) => line.split(','));

				// 各行の配列の最大長を取得
				const sbiAccountJpyArrayLength = sbiAccountJpyArray[0].length;
				const sbiTradingLogJpyArrayLength = sbiTradingLogJpyArray[0].length;
				const maxArrayLength = Math.max(sbiAccountJpyArrayLength, sbiTradingLogJpyArrayLength);

				// それぞれの配列を結合し、各行の配列の長さをそろえる
				const sbiAllArray = sbiAccountJpyArray.concat([[]]).concat(sbiTradingLogJpyArray);
				for (let i = 0; i < sbiAllArray.length; i++) {
					const row = sbiAllArray[i];
					const rowLength = row.length;
					if (rowLength < maxArrayLength) {
						for (let j = 0; j < maxArrayLength - rowLength; j++) {
							row.push('');
						}
					}
				}
				return new Response(JSON.stringify(sbiAllArray), {
					headers: {
						'Content-Type': 'application/json',
					},
				});

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
							<li><a href="/getSbiAllJpy?token=${env.API_TOKEN}">/getSbiAllJpy</a>: SBI証券の円建口座、外貨建口座、取引履歴を取得</li>
							<li><a href="/sbiAccountJpy?token=${env.API_TOKEN}">/sbiAccountJpy</a>: SBI証券の円建口座情報を取得</li>
							<li><a href="/sbiAccountUsd?token=${env.API_TOKEN}">/sbiAccountUsd</a>: SBI証券の外貨建口座情報を取得</li>
							<li><a href="/getSbiTradingLogJpy?token=${env.API_TOKEN}">/getSbiTradingLogJpy</a>: SBI証券の円建取引履歴を取得</li>
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
