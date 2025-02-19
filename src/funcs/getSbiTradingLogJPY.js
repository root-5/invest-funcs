/**
 * SBI証券にログインし口座（円建）の情報を CSV 形式で返却する
 * @param {string} id SBI証券のID
 * @param {string} password SBI証券のパスワード
 * @returns {string} CSV形式の口座情報
 */
export default async function getSbiAccountJPY(id, password) {
	const sbiUrl = 'https://site3.sbisec.co.jp/ETGate/';

	// ログイン用パラメータを指定
	const loginFormData = {
		_PageID: 'WPLETlgR001Rlgn20',
		_ControlID: 'WPLETlgR001Control',
		_ActionID: 'login',
		_ReturnPageInfo: 'WPLETsmR001Control/WPLETsmR001Sdtl18/NoActionID/DSWPLETsmR001Control', // 口座管理-口座（外貨建）-保有証券の画面を指定している
		user_id: id,
		user_password: password,
	};

	// SBI の API トークンを取得
	const loginResponse = await fetch(sbiUrl, {
		method: 'POST',
		body: new URLSearchParams(loginFormData),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': 'Chrome/133.0.0.0',
		},
		redirect: 'manual',
	});

	// Cookie から JSESSIONID, AWSALB, AWSALBCORS を取得
	const loginCookie = loginResponse.headers.get('set-cookie');
	// 「;」または「 」で区切られた Cookie のリストを取得
	const cookiesTextList = loginCookie.split(/; | /);
	let loginCookieText = '';
	for (const cookieText of cookiesTextList) {
		if (cookieText.includes('JSESSIONID') || cookieText.includes('AWSALB') || cookieText.includes('AWSALBCORS')) {
			loginCookieText += cookieText + '; ';
		}
	}

	// SSO トークンを取得
	const ssoResponse = await fetch(loginResponse.headers.get('location'), { redirect: 'manual' });
	const ssoToken = ssoResponse.headers.get('set-cookie').split(';')[0];

	// 今日と1週間前の日付の文字列を生成（YYYYMMDD）
	const formatDate = (date) => {
		const year = date.getFullYear();
		const month = `0${date.getMonth() + 1}`.slice(-2);
		const day = `0${date.getDate()}`.slice(-2);
		return `${year}${month}${day}`;
	};
	const today = new Date();
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const todayStr = formatDate(today);
	const weekAgoStr = formatDate(weekAgo);

	// ログイン用パラメータを指定
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
	return csv;
}
