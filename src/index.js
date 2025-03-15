import getSbiAccountJpy from './funcs/getSbiAccountJpy';
import getSbiAccountUsd from './funcs/getSbiAccountUsd';
import getSbiTodayExecutionJpy from './funcs/getSbiTodayExecutionJpy';
import getSbiOrdersJpy from './funcs/getSbiOrdersJpy';
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
			// 口座（円建）
			case '/sbiAccountJpy':
				const sbiAccountJpy = await getSbiAccountJpy(env);
				return new Response(JSON.stringify(sbiAccountJpy), jsonOption);

			// 当日約定履歴
			case '/getSbiTodayExecutionJpy':
				const sbiTodayExecutionJpy = await getSbiTodayExecutionJpy(env);
				return new Response(JSON.stringify(sbiTodayExecutionJpy), jsonOption);

			// 注文履歴
			case '/getSbiOrdersJpy':
				const sbiExecutionJpy = await getSbiOrdersJpy(env);
				return new Response(JSON.stringify(sbiExecutionJpy), jsonOption);

			// 取引履歴（円建）
			case '/getSbiTradingLogJpy':
				const sbiTradingLogJpy = await getSbiTradingLogJpy(env);
				return new Response(JSON.stringify(sbiTradingLogJpy), jsonOption);

			// 口座（外貨建）
			case '/sbiAccountUsd':
				const sbiAccountUsd = await getSbiAccountUsd(env);
				return new Response(JSON.stringify(sbiAccountUsd), jsonOption);

			// iDeCo
			case '/getSbiIdeco':
				const sbiIdeco = await getSbiIdeco(env);
				return new Response(JSON.stringify(sbiIdeco), jsonOption);

			// すべての情報（円建）
			case '/getSbiAllJpy':
				const _sbiAccountJpy = await getSbiAccountJpy(env);
				const _sbiTradingLogJpy = await getSbiTradingLogJpy(env);
				// const _sbiExecutionJpy = await getSbiOrdersJpy(env);
				const _sbiTodayExecutionJpy = await getSbiTodayExecutionJpy(env);
				const sbiAllJpy = Object.assign({}, _sbiAccountJpy, _sbiTradingLogJpy, _sbiTodayExecutionJpy);
				return new Response(JSON.stringify(sbiAllJpy), jsonOption);

			// すべての情報（外貨建）
			case '/getSbiAllUsd':
				const _sbiAccountUsd = await getSbiAccountUsd(env);
				const _sbiIdeco = await getSbiIdeco(env);
				const sbiAllUsd = Object.assign({}, _sbiAccountUsd, _sbiIdeco);
				return new Response(JSON.stringify(sbiAllUsd), jsonOption);

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
							<li><a href="/sbiAccountJpy?token=${env.API_TOKEN}">/sbiAccountJpy</a>: SBI証券の円建口座情報を取得</li>
							<li><a href="/getSbiTodayExecutionJpy?token=${env.API_TOKEN}">/getSbiTodayExecutionJpy</a>: SBI証券の円建当日約定情報を取得</li>
							<li><a href="/getSbiOrdersJpy?token=${env.API_TOKEN}">/getSbiOrdersJpy</a>: SBI証券の円建注文履歴を取得</li>
							<li><a href="/getSbiTradingLogJpy?token=${env.API_TOKEN}">/getSbiTradingLogJpy</a>: SBI証券の円建取引履歴を取得</li>
							<li><a href="/sbiAccountUsd?token=${env.API_TOKEN}">/sbiAccountUsd</a>: SBI証券の外貨建口座情報を取得</li>
							<li><a href="/getSbiIdeco?token=${env.API_TOKEN}">/getSbiIdeco</a>: SBI証券のiDeCo情報を取得</li>
							<li>----</li>
							<li><a href="/getSbiAllJpy?token=${env.API_TOKEN}">/getSbiAllJpy</a>: SBI証券の円建口座、外貨建口座、取引履歴を取得</li>
							<li><a href="/getSbiAllUsd?token=${env.API_TOKEN}">/getSbiAllUsd</a>: SBI証券の外貨建口座、iDeCo情報を取得</li>
						</ul>
					</body>
					</html>
					`,
					{ headers: { 'Content-Type': 'text/html' } }
				);
		}
	},
};
