import { sendXapiStatement } from "../../src/utils/sendXapiStatement.js";

const PRIMARY_SITE_ORIGIN = "https://zchunter.github.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": PRIMARY_SITE_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string") {
    return false;
  }

  if (origin === PRIMARY_SITE_ORIGIN) {
    return true;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const origin = event.headers?.origin || event.headers?.Origin || "";

    if (!isAllowedOrigin(origin)) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Forbidden" }),
      };
    }

    const payload = JSON.parse(event.body || "{}");
    const rawChecked = payload.replacementsChecked ?? (Array.isArray(payload.replacements) ? payload.replacements.length : undefined);
    const replacementsChecked = Number(rawChecked);
    const totalReplacements = Number(payload.totalReplacements);

    if (!Number.isFinite(replacementsChecked) || replacementsChecked < 0 || !Number.isFinite(totalReplacements) || totalReplacements < 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Invalid payload" }),
      };
    }

    const endpoint = "https://resumelrs.lrs.io/xapi/";
    const username = process.env.LRS_USERNAME;
    const password = process.env.LRS_PASSWORD;

    if (!username || !password) {
      throw new Error("Missing LRS credentials");
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    await sendXapiStatement({
      replacementsChecked,
      totalReplacements,
      tool: "xliff-swapper",
      endpoint,
      auth
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "xAPI statement sent." }),
    };
  } catch (err) {
    // Use encodeURIComponent to sanitize error message before logging
    console.error("xAPI error:", encodeURIComponent(err?.message || "Unknown error"));
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "An error occurred" }),
    };
  }
};
