import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし注文履歴から約定した注文情報を取得、返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {object} 注文履歴から約定した注文情報のオブジェクト
 */
export default async function getSbiExecutionJpy(env, retryCount = 0) {
	// ログイン情報を取得
	const { loginCookieText } = await getSbiSession(env);

	try {
		// 注文履歴ページの HTML ソースを取得
		const firstRes = await fetch(
			'https://site3.sbisec.co.jp/ETGate/?_ControlID=WPLEThiR001Control&_PageID=DefaultPID&_DataStoreID=DSWPLEThiR001Control&_SeqNo=1741802517853_default_task_178241_WPLEThiR001Rser10_search&getFlg=on&_ActionID=DefaultAID',
			{
				method: 'GET',
				headers: {
					cookie: loginCookieText,
					'User-Agent': 'Chrome/133.0.0.0',
				},
			}
		);
		const firstBuffer = await firstRes.arrayBuffer();
		const firstUint8Array = new Uint8Array(firstBuffer);
		const firstHtml = new TextDecoder('shift-jis').decode(firstUint8Array);

		// name="_WBSessionID" の input 要素から value の値を取得
		const hiddenInputMatch = firstHtml.match(/<INPUT TYPE='hidden' name='_WBSessionID' value='(.{1,50})'>/);
		const WBSessionValue = hiddenInputMatch[1];

		// 今日と1週間前の日付の文字列を生成（YYYYMMDD）
		const formatDate = (date) => {
			const year = date.getFullYear();
			const month = `0${date.getMonth() + 1}`.slice(-2);
			const day = `0${date.getDate()}`.slice(-2);
			return `${year}${month}${day}`;
		};
		const today = new Date();
		const weekAgo = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000);
		const todayStr = formatDate(today);
		const weekAgoStr = formatDate(weekAgo);

		// パラメータを指定
		const formData = {
			_ControlID: 'WPLEThiR001Control',
			_PageID: 'WPLEThiR001Rser10',
			_DataStoreID: 'DSWPLEThiR001Control',
			_WBSessionID: WBSessionValue,
			_WID: 'NoWID',
			_ActionID: 'search',
			_WIDMode: 0,
			ref_from_yyyy: weekAgoStr.slice(0, 4),
			ref_from_mm: weekAgoStr.slice(4, 6),
			ref_from_dd: weekAgoStr.slice(6, 8),
			ref_to_yyyy: todayStr.slice(0, 4),
			ref_to_mm: todayStr.slice(4, 6),
			ref_to_dd: todayStr.slice(6, 8),
			max_cnt: 200,
		};

		// HTML ソースを取得
		const secondRes = await fetch('https://site3.sbisec.co.jp/ETGate/?' + new URLSearchParams(formData).toString(), {
			method: 'GET',
			headers: {
				cookie: loginCookieText,
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Chrome/133.0.0.0',
			},
		});
		const buffer = await secondRes.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);
		const secondHtml = new TextDecoder('shift-jis').decode(uint8Array);

		// 株式情報を表示している table 要素の取得
		const stockTableRegex = /<!--▽照会-->([\s\S]*)<!--△照会-->/;
		const stockTableMatch = secondHtml.match(stockTableRegex);
		const stockTableElem = stockTableMatch[1];

		// tr 要素の取得
		const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
		const trElems = [];
		let match;
		while ((match = trRegex.exec(stockTableElem)) !== null) {
			trElems.push(match[0]);
		}
		trElems.splice(0, 2); // 最初の 2 つの tr 要素はヘッダーなので削除

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

		// 注文履歴をオブジェクトに格納
		const stockExecutions = arr.map((v) => {
			return {
				date: v[1].split('\n')[0],
				code: v[5].split('\n')[1].trim(),
				name: v[5].split('\n')[0],
				operation: v[4].split('\n')[0],
				orderType: v[7],
				quantity: parseInt(v[6].split('\n')[0].replace(/,/g, '')),
				price: parseInt(v[8].split('\n')[0].replace(/,/g, '')),
				status: v[2],
			};
		});

		return { stockExecutions: stockExecutions };
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiExecutionJpy(env, retryCount + 1);
		}
		console.log(e);
		return { error: e.message };
	}
}
