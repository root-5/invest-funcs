/**
 * SBI 証券のログイン後セッション情報を取得する
 * @param {object} env - 環境変数
 * @param {object} [options] - オプション（forceUpdate: true を指定すると、強制的にログイン情報を更新する）
 * @returns {object} - セッション情報（loginCookieText: 通常ログインセッション, ssoTokenText: SSO トークン）
 */
export default async function getSbiSession(env, options = {}) {
	// 引数の options に forceUpdate が指定されていない場合は、KV からログイン情報を取得して返却
	if (!options.forceUpdate) {
		const loginCookieText = await env.KV_BINDING.get('loginCookieText');
		const ssoTokenText = await env.KV_BINDING.get('ssoTokenText');
		if (loginCookieText && ssoTokenText) {
			return { loginCookieText: loginCookieText, ssoTokenText: ssoTokenText };
		}
	}

	// ログイン用パラメータを指定
	// _ReturnPageInfo は ssoToken 取得のため、口座管理-口座（外貨建）-保有証券の画面を指定している
	const loginFormData = {
		_PageID: 'WPLETlgR001Rlgn20',
		_ControlID: 'WPLETlgR001Control',
		_ActionID: 'login',
		_ReturnPageInfo: 'WPLETsmR001Control/WPLETsmR001Sdtl18/NoActionID/DSWPLETsmR001Control',
		user_id: env.SBI_ID,
		user_password: env.SBI_PASSWORD,
	};

	// SBI の API トークンを取得
	const loginResponse = await fetch('https://site3.sbisec.co.jp/ETGate/', {
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
	const cookiesTextList = loginCookie.split(/; | /);
	let loginCookieText = '';
	for (const cookieText of cookiesTextList) {
		if (cookieText.includes('JSESSIONID') || cookieText.includes('AWSALB') || cookieText.includes('AWSALBCORS')) {
			loginCookieText += cookieText + '; ';
		}
	}

	// SSO トークンを取得
	const ssoResponse = await fetch(loginResponse.headers.get('location'), { redirect: 'manual' });
	const ssoTokenText = ssoResponse.headers.get('set-cookie').split(';')[0];

	// KV にログイン情報を保存
	await env.KV_BINDING.put('loginCookieText', loginCookieText);
	await env.KV_BINDING.put('ssoTokenText', ssoTokenText);

	return { loginCookieText: loginCookieText, ssoTokenText: ssoTokenText };
}
