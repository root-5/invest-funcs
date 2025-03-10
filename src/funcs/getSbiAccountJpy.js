import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし口座（円建）の情報を取得、返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {object} 口座情報（円建）のオブジェクト
 */
export default async function getSbiAccountJpy(env, retryCount = 0) {
	// ログイン情報を取得
	const { loginCookieText } = await getSbiSession(env);

	try {
		// HTML ソースを取得
		const res = await fetch(
			'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLETacR001Control&_PageID=DefaultPID&_DataStoreID=DSWPLETacR001Control&_ActionID=DefaultAID&getFlg=on',
			{
				method: 'GET',
				headers: {
					cookie: loginCookieText,
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'Chrome/133.0.0.0',
				},
			}
		);
		const buffer = await res.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);
		const portfolioHtml = new TextDecoder('shift-jis').decode(uint8Array);

		// 株式情報を表示している table 要素の取得
		const stockTableRegex =
			/<table border="0" cellspacing="1" cellpadding="1" width="400"><tr><td class="mtext" colspan="4"><font color="#336600">(.*)<\/font><\/b><\/td><\/tr><\/table>/g;
		const stockTableElem = portfolioHtml.match(stockTableRegex);

		// table 要素から各情報を抽出
		let match;
		let stockMarginTypes = [];
		let stockCodes = [];
		let stockNames = [];
		let stockQuantity = [];
		let stockBuyingPrices = [];
		let stockNowPrices = [];
		const stockCodesRegex = /i_stock_sec=(.{1,6})\+&amp;/g;
		const stockNamesRegex = /PER=1">(.{1,20})<\/a>/g;
		const stockQuantityandPricesRegex = /<td class="mtext">(.{1,10})<\/td>/g;
		for (let i = 0; i < stockTableElem.length; i++) {
			const marginType = i === 0 ? '現物' : '信用';
			while ((match = stockCodesRegex.exec(stockTableElem[i])) !== null) {
				stockMarginTypes.push(marginType);
				stockCodes.push(match[1]);
			}
			while ((match = stockNamesRegex.exec(stockTableElem[i])) !== null) {
				stockNames.push(match[1]);
			}
			let count = 0;
			while ((match = stockQuantityandPricesRegex.exec(stockTableElem[i])) !== null) {
				switch (count % 3) {
					case 0:
						stockQuantity.push(Number(match[1].replace(/,/g, '')));
						break;
					case 1:
						stockBuyingPrices.push(Number(match[1].replace(/,/g, '')));
						break;
					case 2:
						stockNowPrices.push(Number(match[1].replace(/,/g, '')));
						break;
				}
				count++;
			}
		}

		// 買付余力を取得
		const buyingPowerRegex = /<td width="150" class="mtext" align="right"><div class="margin">(.{1,10})&nbsp;/;
		const buyingPowerMatch = portfolioHtml.match(buyingPowerRegex)[1];
		const buyingPower = Number(buyingPowerMatch.replace(/,/g, ''));

		// 株式情報をオブジェクトに格納
		const stocks = [];
		for (let i = 0; i < stockCodes.length; i++) {
			stocks.push({
				currencyType: '円建',
				depositType: '特定', // '特定' は仮置き
				marginType: stockMarginTypes[i],
				code: stockCodes[i],
				name: stockNames[i],
				quantity: stockQuantity[i],
				buyPrice: stockBuyingPrices[i],
				currentPrice: stockNowPrices[i],
				profitAndLoss: (stockNowPrices[i] - stockBuyingPrices[i]) * stockQuantity[i],
				marketCap: stockNowPrices[i] * stockQuantity[i],
			});
		}

		return {
			buyingPower: buyingPower,
			stocks: stocks,
		};
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiAccountJpy(env, retryCount + 1);
		}
		console.log(e);
		return { error: e.message };
	}
}
