/**
* SBI証券にログインし口座（円建）の情報を CSV 形式で返却する
* @param {string} id SBI証券のID
* @param {string} password SBI証券のパスワード
* @returns {string} CSV形式の口座情報
*/
export default async function getSbiAccountJPY(id, password) {
    const sbiUrl = "https://site3.sbisec.co.jp/ETGate/";

    // ログイン用パラメータを指定
    const formData = {
        _PageID: "WPLETlgR001Rlgn20",
        _ControlID: "WPLETlgR001Control",
        _ActionID: "login",
        _ReturnPageInfo:
            "WPLETacR001Control/DefaultPID/DefaultAID/DSWPLETacR001Control", // 口座管理-口座（円建）-保有証券の画面を指定している
        user_id: id,
        user_password: password,
    };

    // HTML ソースを取得
    const res = await fetch(sbiUrl,
        {
            method: "POST",
            body: new URLSearchParams(formData),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Chrome/133.0.0.0",
            },
        }
    );
    const buffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const portfolioHtml = new TextDecoder('shift-jis').decode(uint8Array);

    // 株式情報を表示している table 要素の取得
    const stockTableRegex = /<table border="0" cellspacing="1" cellpadding="1" width="400"><tr><td class="mtext" colspan="4"><font color="#336600">(.*)<\/font><\/b><\/td><\/tr><\/table>/g;
    const stockTableElem = portfolioHtml.match(stockTableRegex);

    // table 要素から各情報を抽出
    let match;
    let stockMarginTypes = [];
    let stockCodes = [];
    let stockNames = [];
    let stockShare = [];
    let stockBuyingPrices = [];
    let stockNowPrices = [];
    const stockCodesRegex = /i_stock_sec=(.{1,6})\+&amp;/g;
    const stockNamesRegex = /PER=1">(.{1,20})<\/a>/g;
    const stockShareandPricesRegex = /<td class="mtext">(.{1,10})<\/td>/g;
    for (let i = 0; i < stockTableElem.length; i++) {
        const marginType = i === 0 ? "現物" : "信用";
        while ((match = stockCodesRegex.exec(stockTableElem[i])) !== null) {
            stockMarginTypes.push(marginType);
            stockCodes.push(match[1]);
        }
        while ((match = stockNamesRegex.exec(stockTableElem[i])) !== null) {
            stockNames.push(match[1]);
        }
        let count = 0;
        while ((match = stockShareandPricesRegex.exec(stockTableElem[i])) !== null) {
            switch (count % 3) {
                case 0:
                    stockShare.push(Number(match[1].replace(/,/g, "")));
                    break;
                case 1:
                    stockBuyingPrices.push(Number(match[1].replace(/,/g, "")));
                    break;
                case 2:
                    stockNowPrices.push(Number(match[1].replace(/,/g, "")));
                    break;
            }
            count++;
        }
    }

    // オブジェクトに変換
    const accountInfo = [];
    for (let i = 0; i < stockCodes.length; i++) {
        accountInfo.push({
            margin: stockMarginTypes[i],
            code: stockCodes[i],
            name: stockNames[i],
            share: stockShare[i],
            buyingPrice: stockBuyingPrices[i],
            nowPrice: stockNowPrices[i],
        });
    }

    // 買付余力を取得
    const buyingPowerRegex = /<td width="150" class="mtext" align="right"><div class="margin">(.{1,10})&nbsp;/;
    const buyingPowerMatch = portfolioHtml.match(buyingPowerRegex)[1];
    const buyingPower = buyingPowerMatch.replace(/,/g, "");
    accountInfo.push(
        {
            margin: "-",
            code: "-",
            name: "買付余力",
            share: "-",
            buyingPrice: "-",
            nowPrice: buyingPower,
        }
    )

    // csv 形式で返す
    const csv = accountInfo.map((info) => {
        return `${info.margin},${info.code},${info.name},${info.share},${info.buyingPrice},${info.nowPrice}`;
    }).join("\n");

    return csv;
}