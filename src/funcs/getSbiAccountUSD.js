import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし口座（外貨建）の情報を CSV 形式で返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {string} CSV形式の口座情報
 */
export default async function getSbiAccountUSD(env, retryCount = 0) {
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

		// 必要なパラメータだけのオブジェクトを作成
		const accountInfo = [];
		for (let i = 0; i < json.stockPortfolio.length; i++) {
			for (let j = 0; j < json.stockPortfolio[i].details.length; j++) {
				accountInfo.push({
					margin: '現物',
					code: json.stockPortfolio[i].details[j].securityCode,
					name: json.stockPortfolio[i].details[j].securityName,
					share: json.stockPortfolio[i].details[j].assetQty,
					buyingPrice: json.stockPortfolio[i].details[j].acquisitionPrice,
					nowPrice: json.stockPortfolio[i].details[j].currentPrice,
					buyingPriceJPY:
						(json.stockPortfolio[i].details[j].yenEvaluateAmount - json.stockPortfolio[i].details[j].yenEvaluateProfitLoss) /
						json.stockPortfolio[i].details[j].assetQty,
					nowPriceJPY: json.stockPortfolio[i].details[j].yenEvaluateAmount / json.stockPortfolio[i].details[j].assetQty,
				});
			}
		}

		// csv 形式で返す
		let csv = accountInfo
			.map((info) => {
				return `${info.margin},${info.code},${info.name},${info.share},${info.buyingPrice},${info.nowPrice},${info.buyingPriceJPY},${info.nowPriceJPY}`;
			})
			.join('\n');
		csv = `現/信,コード,銘柄名,株数,買値,現在値,買値（円）,現在値（円）\n${csv}`;
		return csv;
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_COUNT) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiAccountUSD(env, retryCount + 1);
		}
		return 'error';
	}
}
