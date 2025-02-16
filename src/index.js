import getSbiAccountJPY from "./funcs/getSbiAccountJPY";
import getSbiAccountUSD from "./funcs/getSbiAccountUSD";

export default {
	async fetch(request, env, ctx) {
		// リクエストパスを取得
		const url = new URL(request.url);
		const path = url.pathname;
		console.log("PATH: " + path);

		// クエリからトークンを取得
		const token = url.searchParams.get("token");

		// トークンが正しいか確認
		if (token !== env.API_TOKEN) {
			return new Response("Unauthorized", { status: 401 });
		}

		switch (path) {
			case "/sbiAccountJPY":
				const sbiAccountJPY = await getSbiAccountJPY(env.SBI_ID, env.SBI_PASSWORD);
				return new Response(sbiAccountJPY);
			case "/sbiAccountUSD":
				const sbiAccountUSD = await getSbiAccountUSD(env.SBI_ID, env.SBI_PASSWORD);
				return new Response(sbiAccountUSD);
			default:
				// return new Response("Not Found", { status: 404 });
				return new Response(`
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
						</ul>
					</body>
					</html>
					`, { headers: { "Content-Type": "text/html" } });
		}
	},
};
