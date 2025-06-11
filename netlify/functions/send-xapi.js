import { sendXapiStatement } from "../../src/utils/sendXapiStatement.js";

exports.handler = async (event) => {
    // CORS preflight handling
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
            "Access-Control-Allow-Origin": "https://zchunter.github.io",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: ""
        };
    }

  try {
    const { replacements, totalReplacements } = JSON.parse(event.body || "{}");
    const endpoint = "https://resumelrs.lrs.io/xapi/";
    const username = process.env.LRS_USERNAME;
    const password = process.env.LRS_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    await sendXapiStatement({
      replacementsChecked: replacements.length,
      totalReplacements,
      tool: "xliff-swapper",
      endpoint,
      auth
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://zchunter.github.io",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ message: "xAPI statement sent." })
    };
  } catch (err) {
    console.error("xAPI error:", err.message);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://zchunter.github.io",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
