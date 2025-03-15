import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし当日約定履歴を取得、返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {object} 当日約定履歴のオブジェクト
 */
export default async function getSbiTodayExecutionJpy(env, retryCount = 0) {
	// ログイン情報を取得
	const { loginCookieText } = await getSbiSession(env);

	try {
		// 当日約定ページの HTML ソースを取得
		const res = await fetch(
			'https://site3.sbisec.co.jp/ETGate/WPLETagR001Control/DefaultPID/DefaultAID?OutSide=on&getFlg=on&int_pr1=150313_cmn_gnavi:1_dmenu_09',
			{
				method: 'GET',
				headers: {
					cookie: loginCookieText,
					'User-Agent': 'Chrome/133.0.0.0',
				},
			}
		);
		const buffer = await res.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);
		const html = new TextDecoder('shift-jis').decode(uint8Array);

		// 「現在、お客様の当日約定はございません。」が含まれる場合は空のオブジェクトを返却
		if (html.includes('現在、お客様の当日約定はございません。')) return { todayExecutions: [] };

		// HTML ソースから当日約定を取得
		// 「<!--△検索タブ-->」から「<!--▼GetHtml枠-->」までを取得
		const tablesMatch = html.match(/<!--△検索タブ-->([\s\S]*?)<!--▼GetHtml枠-->/);

		// tr 要素の取得
		const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
		const trElems = [];
		let match;
		while ((match = trRegex.exec(tablesMatch[1])) !== null) {
			trElems.push(match[0]);
		}

		// tr 要素の中から td 要素を取得し、各 td 要素のテキストを取得
		const arr = [];
		trElems.forEach((trElem, i) => {
			arr.push([]);
			const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
			let tdMatch;
			let j = 0;
			while ((tdMatch = tdRegex.exec(trElem)) !== null) {
				// HTMLタグを除去してテキストのみ取得
				const tdContent = tdMatch[1];
				const tdText = tdContent.replace(/<[^>]*>/g, '').trim();
				arr[i].push(tdText);
				j++;
			}
			if (j === 0) {
				console.log('td 要素が見つかりませんでした:', trElem.substring(0, 100));
			}
		});

		// 当日約定をオブジェクトに格納
		const todayExecutions = processExecutions(arr);

		return { todayExecutions: todayExecutions };
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiTodayExecutionJpy(env, retryCount + 1);
		}
		console.log(e);
		return { error: e.message };
	}
}

// 当日約定をオブジェクトに格納する関数
const processExecutions = (arr) => {
	// 結果を格納する配列
	const executions = [];

	// 各行を処理
	for (let i = 0; i < arr.length; i++) {
		const row = arr[i];

		// ヘッダー行はスキップ
		if (row[0] === '' || row[0] === '銘柄') {
			continue;
		}

		// row の長さが 8 の場合は銘柄名が一列前と共通になる仕様のため、銘柄名を補完する
		if (row.length === 8) {
			row.unshift(arr[i - 1][0]);
		}

		// 銘柄コードを抽出（通常は4桁の数字）
		const codeMatch = row[0].match(/\d{4}/);
		const code = codeMatch ? codeMatch[0] : '';

		// 銘柄名を抽出（コードを除いた部分）
		const name = code ? row[0].replace(code, '').trim() : row[0];

		// 取引タイプ（買い/売り）を抽出
		let tradeType = row[1];

		// 日付情報を処理
		const dateString = row[2] || '';
		let date = '';
		if (dateString) {
			const dates = dateString.split('/');
			if (dates.length >= 3) {
				// YY/MM/DDの形式を処理
				const year = dates[0].includes('20') ? dates[0] : `20${dates[0]}`;
				date = `${year}/${dates[1]}/${dates[2].substring(0, 2)}`;
			}
		}

		// 数値データを処理（カンマ除去、数値変換）
		const quantity = parseInt((row[3] || '0').replace(/,/g, '')) || 0;
		const price = parseFloat((row[4] || '0').replace(/,/g, '')) || 0;
		const fee = parseFloat((row[5] || '0').replace(/,/g, '')) || 0;

		// 取引オブジェクトを作成
		const execution = {
			currencyType: '円建',
			date, // 約定日
			code, // 証券コード
			name, // 銘柄名
			tradeType, // 取引種別
			quantity, // 数量
			price, // 単価
			fee, // 手数料
		};

		executions.push(execution);
	}

	return executions;
};
