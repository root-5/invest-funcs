import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし口座（外貨建）の情報を取得、オブジェクトで返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {object} 口座情報（外貨建）のオブジェクト
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

		// 株式情報をオブジェクトの配列に変換
		const stocks = [];
		for (let i = 0; i < json.stockPortfolio.length; i++) {
			// 口座種別を判定
			let depositType = '';
			switch (json.stockPortfolio[i].depositType) {
				case 'GROWTH_INVESTMENT':
					depositType = 'NISA';
					break;
				case 'SPECIFIC':
					depositType = '特定';
					break;
				case 'GENERAL':
					depositType = '一般';
					break;
				default:
					depositType = '不明';
					break;
			}

			for (let j = 0; j < json.stockPortfolio[i].details.length; j++) {
				const detail = json.stockPortfolio[i].details[j];
				const yenAcquisitionPrice = (detail.yenEvaluateAmount - detail.yenEvaluateProfitLoss) / detail.assetQty;
				const yenCurrentPrice = detail.yenEvaluateAmount / detail.assetQty;

				stocks.push({
					currencyType: '外貨建',
					depositType: depositType,
					marginType: '現物',
					code: detail.securityCode,
					name: detail.securityName,
					quantity: detail.assetQty,
					buyPrice: detail.acquisitionPrice,
					currentPrice: detail.currentPrice,
					profitAndLoss: detail.foreignEvaluateProfitLoss,
					marketCap: detail.foreignEvaluateAmount,
					yenBuyPrice: yenAcquisitionPrice,
					yenCurrentPrice: yenCurrentPrice,
					yenProfitAndLoss: detail.yenEvaluateProfitLoss,
					yenMarketCap: detail.yenEvaluateAmount,
				});
			}
		}

		return { stocks: stocks };
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiAccountUsd(env, retryCount + 1);
		}
		console.log(e);
		return { error: e.message };
	}
}
