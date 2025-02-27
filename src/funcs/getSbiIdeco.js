export default async function getSbiIdeco(env, retryCount = 0) {
	try {
		const loginPageRes = await fetch('https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx');
		const loginPageBuffer = await loginPageRes.arrayBuffer();
		const loginPageUint8Array = new Uint8Array(loginPageBuffer);
		const loginPageHtml = new TextDecoder('shift-jis').decode(loginPageUint8Array);

		// form タグ内の input 要素の type が hidden であるものを取得
		const hiddenInputRegex = /<input type="hidden" name="(.*)" id="(.*)" value="(.*)" \/>/g;
		const hiddenInputList = loginPageHtml.match(hiddenInputRegex);
		const hiddenInputObj = {};
		for (const hiddenInput of hiddenInputList) {
			const hiddenInputMatch = hiddenInput.match(/<input type="hidden" name="(.*)" id="(.*)" value="(.*)" \/>/);
			const name = hiddenInputMatch[1];
			const value = hiddenInputMatch[3];
			hiddenInputObj[name] = value;
		}

		// cookie を取得
		const loginCookie = loginPageRes.headers.get('set-cookie');

		const formData = {
			__EVENTTARGET: 'btnHome',
			__EVENTARGUMENT: '',
			__VIEWSTATE: hiddenInputObj.__VIEWSTATE,
			__VIEWSTATEGENERATOR: hiddenInputObj.__VIEWSTATEGENERATOR,
			__EVENTVALIDATION: hiddenInputObj.__EVENTVALIDATION,
			txtFocusItem: 'txtUserID',
			txtUserID: '111111111111',
			txtPassword: '111111111111',
			redirect: 'manual',
		};

		// HTML ソースを取得
		const loginRes = await fetch('https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Chrome/133.0.0.0',
				Cookie: loginCookie,
			},
			body: new URLSearchParams(formData),
		});
		const buffer = await loginRes.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);
		const portfolioHtml = new TextDecoder('shift-jis').decode(uint8Array);

		// Cookie を取得
		const loginCookie2 = loginRes.headers.get('set-cookie');

		console.log(loginCookie);
		console.log('\n\n');
		console.log(loginCookie2);

		// return portfolioHtml;

		const resultRes = await fetch('https://www.benefit401k.com/customer/RkDCMember/Home/JP_D_MemHome.aspx', {
			headers: {
				cookie: loginCookie + '; ' + loginCookie2,
				Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_Password_ChangePassword_Warning.aspx',
			},
			body: null,
			method: 'GET',
		});
		const resultBuffer = await resultRes.arrayBuffer();
		const resultUint8Array = new Uint8Array(resultBuffer);
		const resultHtml = new TextDecoder('shift-jis').decode(resultUint8Array);
		return resultHtml;

		// 株式情報を表示している table 要素の取得
		const stockTableRegex =
			/<table border="0" cellspacing="1" cellpadding="1" width="400"><tr><td class="mtext" colspan="4"><font color="#336600">(.*)<\/font><\/b><\/td><\/tr><\/table>/g;
		const stockTableElem = portfolioHtml.match(stockTableRegex);
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		// if (retryCount < env.RETRY_COUNT) {
		// 	await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
		// 	await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
		// 	return getSbiAccountJPY(env, retryCount + 1);
		// }
		console.log(e);
		return 'error';
	}
}
