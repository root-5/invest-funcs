/**
 * SBI ベネフィットシステムズにログインし iDeco の情報を取得、二次元配列で返却する
 * @param {object} env 環境変数
 * @param {number} retryCount リトライ回数のカウント
 * @returns {string[][]} 取引履歴（円建）の二次元配列
 */
export default async function getSbiIdeco(env, options = {}, retryCount = 0) {
	try {
		let lastCookie;
		// 引数の options に forceUpdate が指定されていない場合は KV からログイン情報を取得、forceUpdate が true の場合は、ログイン情報を更新
		if (options.forceUpdate !== true) {
			lastCookie = await env.KV_BINDING.get('idecoLoginCookieText');
		} else {
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

			// cookie を取得しオブジェクトに変換
			const firstCookie = loginPageRes.headers.get('set-cookie');
			const firstCookieObj = {};
			firstCookie.split(/; | /).forEach((cookie) => {
				const regex = /([^=]+)=([^=]+)/;
				const cookieArr = cookie.match(regex);
				if (!cookieArr) return;
				firstCookieObj[cookieArr[1]] = cookieArr[2];
			});

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
			// フォーム送信（リダイレクト１）
			// HTML ソースを取得
			const firstRedirectRes = await fetch('https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx', {
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					cookie: firstCookie,
					Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx',
				},
				body: bodyText,
				method: 'POST',
				redirect: 'manual',
			});

			// cookie を取得しオブジェクトに変換
			let secondCookie = firstRedirectRes.headers.get('set-cookie');
			const secondCookieObj = {};
			secondCookie.split(/; | /).forEach((cookie) => {
				const regex = /([^=]+)=([^=]+)/;
				const cookieArr = cookie.match(regex);
				if (!cookieArr) return;
				secondCookieObj[cookieArr[1]] = cookieArr[2];
			});

			// firstCookieObj と secondCookieObj を結合し、同じキーがあれば新しい値で上書き
			Object.assign(firstCookieObj, secondCookieObj);
			secondCookie = Object.entries(firstCookieObj)
				.map(([key, value]) => {
					return `${key}=${value}`;
				})
				.join('; ');

			// ================================================================================
			// フォーム送信（リダイレクト２）
			const secondRedirectRes = await fetch('https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_EmailAddress_Registration.aspx', {
				headers: {
					cookie: secondCookie,
					Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_BFKLogin.aspx',
				},
				body: null,
				method: 'GET',
				redirect: 'manual',
			});
			// cookie を取得しオブジェクトに変換
			lastCookie = secondRedirectRes.headers.get('set-cookie');
			const lastCookieObj = {};
			lastCookie.split(/; | /).forEach((cookie) => {
				const regex = /([^=]+)=([^=]+)/;
				const cookieArr = cookie.match(regex);
				if (!cookieArr) return;
				lastCookieObj[cookieArr[1]] = cookieArr[2];
			});

			// firstCookieObj, secondCookieObj, lastCookieObj を結合し、同じキーがあれば新しい値で上書き
			Object.assign(firstCookieObj, secondCookieObj, lastCookieObj);
			lastCookie = Object.entries(firstCookieObj)
				.map(([key, value]) => {
					return `${key}=${value}`;
				})
				.join('; ');
		}

		// ================================================================================
		// フォーム送信（リダイレクト３）
		const loginResRedirect3 = await fetch('https://www.benefit401k.com/customer/RkDCMember/Home/JP_D_MemHome.aspx', {
			headers: {
				cookie: lastCookie,
				Referer: 'https://www.benefit401k.com/customer/RkDCMember/Common/JP_D_EmailAddress_Registration.aspx',
				'User-Agent': 'Chrome/133:0:0:0',
			},
			body: null,
			method: 'GET',
			redirect: 'manual',
		});
		const resultBuffer = await loginResRedirect3.arrayBuffer();
		const resultUint8Array = new Uint8Array(resultBuffer);
		const resultHtml = new TextDecoder('shift-jis').decode(resultUint8Array);

		const profitAndLossEles = resultHtml.match(/損益表[\s\S]*?\/損益表/)[0]; // 「損益表」から「/損益表」までの間を取得
		const profitAndLossTable = profitAndLossEles.match(/<table[\s\S]*?<\/table>/)[0]; // 「<table」から「</table>」までの間を取得

		// table要素の解析を正規表現で行う
		const squareArray = [];
		const rows = profitAndLossTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || []; // テーブル行を取得
		for (let i = 0; i < rows.length; i++) {
			const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []; // 行からセルを取得
			squareArray.push([]);
			for (const cell of cells) {
				const text = cell.replace(/<[^>]*>/g, '').trim(); // セルからテキストを抽出（HTMLタグを除去）
				squareArray[i].push(text.replace(/\r\n|\t|&nbsp;|"|,/g, '')); // 記号等を削除して配列に追加
			}
		}

		// 二次元配列の長さをそろえ、すべて '' の行を削除
		const maxLength = Math.max(...squareArray.map((row) => row.length));
		for (let i = 0; i < squareArray.length; i++) {
			const rowLength = squareArray[i].length;
			if (rowLength < maxLength) {
				for (let j = 0; j < maxLength - rowLength; j++) {
					squareArray[i].push('');
				}
			}
		}
		const filteredArray = squareArray.filter((row) => row.some((cell) => cell !== ''));

		// ラベル追加し、最終行を削除
		filteredArray.unshift(['商品タイプ', '運用商品名（略称）', '資産残高', '損益']);
		filteredArray.pop();

		// lastCookie を KV に保存
		await env.KV_BINDING.put('idecoLoginCookieText', lastCookie);
		return filteredArray;

		// ================================================================================
	} catch (e) {
		// 取得失敗時は指定回数までリトライ
		if (retryCount < env.RETRY_MAX) {
			await new Promise((resolve) => setTimeout(resolve, env.RETRY_INTERVAL)); // 待機
			const csv = await getSbiIdeco(env, { forceUpdate: true }, retryCount + 1); // ログイン情報を更新
			return csv;
		}
		console.log(e);
		return 'error';
	}
}
