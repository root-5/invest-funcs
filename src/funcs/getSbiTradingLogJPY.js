import getSbiSession from './modules/getSbiSession';

/**
 * SBI証券にログインし取引履歴（円建）の情報を CSV 形式で返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {string} CSV形式の口座情報
 */
export default async function getSbiTradingLogJPY(env, retryCount = 0) {
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
		_ControlID: 'WPLETacR007Control',
		_PageID: 'WPLETacR007Rget10',
		getFlg: 'on',
		_ActionID: 'csv',
		reference_from: weekAgoStr,
		reference_to: todayStr,
		number_from: '1',
		number_to: '200',
	};

	// ログイン情報を取得
	const { loginCookieText } = await getSbiSession(env);

	try {
		// HTML ソースを取得
		const res = await fetch('https://site3.sbisec.co.jp/ETGate/?' + new URLSearchParams(formData).toString(), {
			headers: {
				cookie: loginCookieText,
				user_agent: 'Chrome/133.0.0.0',
			},
			method: 'GET',
		});
		const buffer = await res.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);
		const csv = new TextDecoder('shift-jis').decode(uint8Array);

		// 最初の 8 行を削除
		const lines = csv.split('\n');
		lines.splice(0, 8);
		return lines.join('\n');
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
			return getSbiTradingLogJPY(env, retryCount + 1);
		}
		console.log(e);
		return 'error';
	}
}
