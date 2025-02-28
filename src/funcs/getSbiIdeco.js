export default async function getSbiIdeco(env, retryCount = 0) {
	try {
		// ================================================================================
		// ================================================================================
		// ログインページの HTML ソースを取得
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

		// cookie を取得し、そのうちの AWSALB, AWSALBCORS, SVRID を取得
		const loginCookie1 = loginPageRes.headers.get('set-cookie');

		const formData = {
			__EVENTTARGET: 'btnLogin',
			__EVENTARGUMENT: '',
			__VIEWSTATE: hiddenInputObj.__VIEWSTATE,
			__VIEWSTATEGENERATOR: hiddenInputObj.__VIEWSTATEGENERATOR,
			__EVENTVALIDATION: hiddenInputObj.__EVENTVALIDATION,
			txtFocusItem: 'txtUserID',
			txtUserID: env.IDECO_ID,
			txtPassword: env.IDECO_PASSWORD,
		};
		const body = new URLSearchParams(formData);
		const bodyText = body.toString();

		// ================================================================================
		// ================================================================================
		// フォーム送信（リダイレクト１）
		// HTML ソースを取得
		const loginResRedirect1 = await fetch('https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx', {
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				cookie: loginCookie1,
				Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx',
			},
			body: bodyText,
			method: 'POST',
			redirect: 'manual',
		});

		// cookie を取得し、そのうちの AWSALB, AWSALBCORS, SVRID, ASP.NET_SessionId を取得
		const loginCookie2 = loginResRedirect1.headers.get('set-cookie');
		const loginCookie2AWSALB = loginCookie2.match(/AWSALB=(.*);/)[1];
		const loginCookie2AWSALBCORS = loginCookie2.match(/AWSALBCORS=(.*);/)[1];
		const loginCookie2SVRID = loginCookie2.match(/SVRID=(.*);/)[1];
		const loginCookie2ASPNETSessionId = loginCookie2.match(/ASP.NET_SessionId=(.*);/)[1];

		console.log('\n---------------------------\n');
		console.log('\n---------------------------\n');
		console.log('\n---------------------------\n');
		console.log('loginCookie2');
		console.log('\n---------------------------\n');
		console.log(loginCookie2);

		// const buffer1 = await loginResRedirect1.arrayBuffer();
		// const uint8Array1 = new Uint8Array(buffer1);
		// const portfolioHtml1 = new TextDecoder('shift-jis').decode(uint8Array1);
		// return portfolioHtml1;

		// ================================================================================
		// ================================================================================
		// フォーム送信（リダイレクト２）
		const loginResRedirect2 = await fetch('https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_EmailAddress_Registration.aspx', {
			headers: {
				accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
				'accept-language': 'ja',
				'cache-control': 'no-cache',
				pragma: 'no-cache',
				priority: 'u=0, i',
				'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Windows"',
				'sec-fetch-dest': 'document',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'same-origin',
				'sec-fetch-user': '?1',
				'upgrade-insecure-requests': '1',
				// cookie: `SVRID=${loginCookie2SVRID}; AWSALB=${loginCookie2AWSALB}; AWSALBCORS=${loginCookie2AWSALBCORS}; ASP.NET_SessionId=${loginCookie2ASPNETSessionId}`,
				cookie: loginCookie2,
				Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
			body: null,
			method: 'GET',
			redirect: 'manual',
		});
		const loginCookie3 = loginResRedirect2.headers.get('set-cookie');

		console.log('\n---------------------------\n');
		console.log('\n---------------------------\n');
		console.log('\n---------------------------\n');
		console.log('loginCookie3');
		console.log('\n---------------------------\n');
		console.log(loginCookie3);

		const buffer2 = await loginResRedirect2.arrayBuffer();
		const uint8Array2 = new Uint8Array(buffer2);
		const portfolioHtml2 = new TextDecoder('shift-jis').decode(uint8Array2);
		return portfolioHtml2;

		// ================================================================================
		// ================================================================================
		// フォーム送信（リダイレクト３）
		const loginResRedirect3 = await fetch('https://www.benefit401k.com/customer/RkDCMember/Home/JP_D_MemHome.aspx', {
			headers: {
				cookie: loginCookie3,
				// cookie: loginCookie1 + '; ' + loginCookie2 + '; ' + loginCookie3,
				referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_EmailAddress_Registration.aspx',
				'User-Agent': 'Chrome/133:0:0:0',
			},
			body: null,
			method: 'GET',
			redirect: 'manual',
		});
		const resultBuffer = await loginResRedirect3.arrayBuffer();
		const resultUint8Array = new Uint8Array(resultBuffer);
		const resultHtml = new TextDecoder('shift-jis').decode(resultUint8Array);
		return resultHtml;

		// 株式情報を表示している table 要素の取得
		const stockTableRegex =
			/<table border="0" cellspacing="1" cellpadding="1" width="400"><tr><td class="mtext" colspan="4"><font color="#336600">(.*)<\/font><\/b><\/td><\/tr><\/table>/g;
		const stockTableElem = portfolioHtml.match(stockTableRegex);
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		// if (retryCount < env.RETRY_MAX) {
		// 	await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
		// 	await getSbiSession(env, { forceUpdate: true }); // ログイン情報を更新
		// 	return getSbiAccountJPY(env, retryCount + 1);
		// }
		console.log(e);
		return 'error';
	}
}
