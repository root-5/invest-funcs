import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし口座（外貨建）の情報を取得、二次元配列で返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {string[][]} 口座情報（外貨建）の二次元配列
 */
export default async function getSbiAccountUsd(env, retryCount = 0) {
	// ログイン情報を取得
	const { ssoTokenText } = await getSbiSession(env);

	try {
		// 外貨建の口座情報 API へアクセス
		const res = await fetch('https://site.sbisec.co.jp/account/api/foreign/summary', {
			headers: {
				cookie: ssoTokenText,
			},
			body: null,
			method: 'GET',
		});
		const json = await res.json();

		// 必要なパラメータだけの二次元配列を作成
		const squareArray = [];
		for (let i = 0; i < json.stockPortfolio.length; i++) {
			for (let j = 0; j < json.stockPortfolio[i].details.length; j++) {
				squareArray.push([
					'現物',
					json.stockPortfolio[i].details[j].securityCode,
					json.stockPortfolio[i].details[j].securityName,
					json.stockPortfolio[i].details[j].assetQty,
					json.stockPortfolio[i].details[j].acquisitionPrice,
					json.stockPortfolio[i].details[j].currentPrice,
					(json.stockPortfolio[i].details[j].yenEvaluateAmount - json.stockPortfolio[i].details[j].yenEvaluateProfitLoss) /
						json.stockPortfolio[i].details[j].assetQty,
					json.stockPortfolio[i].details[j].yenEvaluateAmount / json.stockPortfolio[i].details[j].assetQty,
				]);
			}
		}

		// ラベルを追加
		squareArray.unshift(['現/信', 'コード', '銘柄名', '株数', '買値', '現在値', '買値（円）', '現在値（円）']);

		return squareArray;
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiAccountUsd(env, retryCount + 1);
		}
		console.log(e);
		return 'error';
	}
}
