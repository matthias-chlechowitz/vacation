// Vercel serverless function: Strava OAuth2 token exchange + refresh.
//
// Why this exists: Strava's OAuth2 token endpoint requires the client_secret
// (Strava does NOT support PKCE), and access tokens expire every 6 hours so
// refreshing also needs the secret. A static GitHub Pages site cannot hold a
// secret, so this tiny proxy holds it instead and never exposes it to the
// browser.
//
// Required environment variables (set in the Vercel project settings):
//   STRAVA_CLIENT_ID     - your Strava API application's Client ID
//   STRAVA_CLIENT_SECRET - your Strava API application's Client Secret
//   ALLOWED_ORIGIN       - the site origin allowed to call this proxy,
//                          e.g. https://matthias-chlechowitz.github.io
//
// Request body (JSON), one of:
//   { "code": "<authorization_code>" }        -> initial code exchange
//   { "refresh_token": "<refresh_token>" }    -> refresh an expired token
//
// Response (JSON): { access_token, refresh_token, expires_at }

const TOKEN_URL = "https://www.strava.com/oauth/token";

function setCors(res) {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJsonBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: "Server missing STRAVA_CLIENT_ID/SECRET" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);

  if (body.code) {
    params.set("grant_type", "authorization_code");
    params.set("code", body.code);
  } else if (body.refresh_token) {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", body.refresh_token);
  } else {
    res.status(400).json({ error: "Provide either 'code' or 'refresh_token'" });
    return;
  }

  try {
    const stravaRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await stravaRes.json();
    if (!stravaRes.ok) {
      res.status(stravaRes.status).json({ error: "Strava token error", detail: data });
      return;
    }
    // Only return what the client needs; never leak the secret.
    res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
  } catch (err) {
    res.status(502).json({ error: "Upstream request failed", detail: String(err) });
  }
}
