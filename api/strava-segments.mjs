// Vercel serverless function: proxy for Strava's "explore segments" endpoint.
//
// Why this exists: the browser sends its Bearer access token here and this
// function forwards the request to Strava. This keeps a single trusted origin
// talking to Strava and avoids relying on Strava's CORS behaviour from the
// static site. No secret is used here - just pass-through of the caller token.
//
// Required environment variable:
//   ALLOWED_ORIGIN - the site origin allowed to call this proxy.
//
// Request: GET /api/strava-segments?bounds=<sw_lat,sw_lng,ne_lat,ne_lng>&activity_type=<running|riding>
// Auth:    Authorization: Bearer <access_token>  (forwarded from the browser)
// Response: Strava's ExplorerResponse JSON ({ segments: [...] }).

const EXPLORE_URL = "https://www.strava.com/api/v3/segments/explore";

function setCors(res) {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }

  const { bounds, activity_type } = req.query;
  if (!bounds) {
    res.status(400).json({ error: "Missing 'bounds' query param" });
    return;
  }

  // Strava only accepts 'running' or 'riding' for activity_type.
  const activity = activity_type === "riding" ? "riding" : "running";

  const url = new URL(EXPLORE_URL);
  url.searchParams.set("bounds", bounds);
  url.searchParams.set("activity_type", activity);

  try {
    const stravaRes = await fetch(url, {
      headers: { Authorization: auth },
    });
    const data = await stravaRes.json();
    if (!stravaRes.ok) {
      res.status(stravaRes.status).json({ error: "Strava API error", detail: data });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream request failed", detail: String(err) });
  }
}
