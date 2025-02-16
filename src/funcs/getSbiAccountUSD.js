/**
 * SBI証券にログインし口座（外貨建）の情報を CSV 形式で返却する
 * @param {string} id SBI証券のID
 * @param {string} password SBI証券のパスワード
 * @returns {string} CSV形式の口座情報
 */
export default async function getSbiAccountUSD(id, password) {
    const sbiUrl = "https://site3.sbisec.co.jp/ETGate/";

    // ログイン用パラメータを指定
    const formData = {
        _PageID: "WPLETlgR001Rlgn20",
        _ControlID: "WPLETlgR001Control",
        _ActionID: "login",
        _ReturnPageInfo:
            "WPLETsmR001Control/WPLETsmR001Sdtl18/NoActionID/DSWPLETsmR001Control", // 口座管理-口座（外貨建）-保有証券の画面を指定している
        user_id: id,
        user_password: password,
    };

    // SBI の API トークンを取得
    const loginResponse = await fetch(sbiUrl,
        {
            method: "POST",
            body: new URLSearchParams(formData),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Chrome/133.0.0.0",
            },
            redirect: "manual",
        }
    );

    // SSO トークンを取得
    const ssoResponse = await fetch(loginResponse.headers.get("location"), { redirect: "manual" });
    const ssoToken = ssoResponse.headers.get("set-cookie").split(";")[0];

    // 外貨建の口座情報 API へアクセス
    const res = await fetch("https://site.sbisec.co.jp/account/api/foreign/summary", {
        "headers": {
            "cookie": ssoToken,
        },
        "body": null,
        "method": "GET"
    });
    const json = await res.json();

    // 必要なパラメータだけのオブジェクトを作成
    const accountInfo = [];
    for (let i = 0; i < json.stockPortfolio.length; i++) {
        for (let j = 0; j < json.stockPortfolio[i].details.length; j++) {
            accountInfo.push({
                margin: "現物",
                code: json.stockPortfolio[i].details[j].securityCode,
                name: json.stockPortfolio[i].details[j].securityName,
                share: json.stockPortfolio[i].details[j].assetQty,
                buyingPrice: json.stockPortfolio[i].details[j].acquisitionPrice,
                nowPrice: json.stockPortfolio[i].details[j].currentPrice,
                buyingPriceJPY: (json.stockPortfolio[i].details[j].yenEvaluateAmount - json.stockPortfolio[i].details[j].yenEvaluateProfitLoss) / json.stockPortfolio[i].details[j].assetQty,
                nowPriceJPY: json.stockPortfolio[i].details[j].yenEvaluateAmount / json.stockPortfolio[i].details[j].assetQty,
            });
        }
    }

    // csv 形式で返す
    let csv = accountInfo.map((info) => {
        return `${info.margin},${info.code},${info.name},${info.share},${info.buyingPrice},${info.nowPrice},${info.buyingPriceJPY},${info.nowPriceJPY}`;
    }).join("\n");
    csv = `現/信,コード,銘柄名,株数,買値,現在値,買値（円）,現在値（円）\n${csv}`;

    return csv;
}
