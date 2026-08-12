# Sölden Vacation Tracker

Single-page tool for a Sölden, Tirol vacation: 15.08.2026–27.08.2026.

## Context / why

User wanted one page to check weather/forecast, cablecar status, trail status,
bus plans, and hike ideas during the trip. Greenfield project, no existing
codebase to build on.

Researched live data sources before building:
- **Weather**: [Open-Meteo](https://open-meteo.com/) — free, no API key, CORS-open,
  works from pure client-side JS. 16-day daily forecast covers most of the trip.
- **Cablecar status**: Bergbahnen Sölden publishes live lift/piste status at
  soelden.com, but no public API — it's a webpage, not fetchable from browser JS (CORS).
- **Trail status**: same situation — soelden.com's bike trail status page is a
  page, not an API.
- **Bus**: VVT (Verkehrsverbund Tirol) has a journey planner (fahrplan.vvt.at /
  vvt.at) but no public/documented API usable from a static site.

Since the app is a static site with no backend, only Open-Meteo is integrated
as real live data. Cablecar/trail/bus are **link-out cards** to the official
live-status pages instead — decided against building a backend just to proxy
scrape three pages for a personal vacation tool.

## Structure

Everything lives in one file: `index.html` (plain HTML/CSS/JS, no build step,
no framework, no dependencies).

1. **Header**: trip title, dates, live countdown/day-of-trip (computed from `Date`).
2. **Weather**: fetches Open-Meteo on load, current conditions + 16-day forecast
   grid. Trip days (15–27 Aug) are highlighted. Weather codes mapped to
   emoji/text via the `WMO` lookup table.
3. **Cablecar status**: link-out card → soelden.com live status, bergbahnen.soelden.com.
4. **Trail status**: link-out card → soelden.com bike trail status, hiking routes page.
5. **Hike of the Day**: date-seeded pick from a hardcoded `HIKES` array (curated
   Ötztal/Sölden routes), rotates automatically once per day. Links to a Google
   Maps search anchored at the starting-point coords so results are near the
   actual trailhead, not just "Sölden" generally.
6. **Bus plans**: link-out card → VVT journey planner, with the relevant line
   numbers noted (320, Skibus 44) since there's no way to prefill the planner.
7. **Strava nearby segments**: OAuth2-connected card showing popular Strava
   segments near the trailhead via `GET /api/v3/segments/explore`. This is *in
   addition to* the AllTrails link-out, not a replacement.

## Strava integration

Why it's built the way it is (researched against the official v3 API reference):

- Strava's in-app "Suggested Routes" (per-sport, per-location route generator)
  is **not** in the public API. The closest public endpoint is
  `segments/explore` → most popular segments in a bounding box. That's what the
  card uses.
- `segments/explore`'s `activity_type` only accepts `running` or `riding` — no
  "hiking". The Foot/Bike toggle maps 🥾 Foot → `running`, 🚴 Bike → `riding`.
- **OAuth2 needs a backend.** Strava's token exchange + refresh require the
  `client_secret` (Strava has **no PKCE**), and access tokens expire every 6h.
  A static site can't hold a secret, so a tiny **Vercel serverless proxy** holds
  it. This is a deliberate, scoped exception to the "no backend" rule below —
  it's the *only* secure way to do real Strava OAuth2. Don't try to move the
  secret into `index.html`.

Files:
- `api/strava-token.mjs` — token exchange (`{code}`) and refresh
  (`{refresh_token}`). Holds the secret; only returns
  `access_token`/`refresh_token`/`expires_at` to the browser.
- `api/strava-segments.mjs` — proxies `segments/explore`, forwarding the
  browser's Bearer token (avoids relying on Strava CORS).
- `vercel.json` — functions config (`api/*.mjs`). Files are `.mjs` so Vercel
  treats them as ES modules.
- `index.html` — Strava section, OAuth redirect handling, token storage in
  `localStorage`, segment rendering, en/de/ru i18n (`strava.*` keys).

Setup required to make it live (manual, non-secret bits go in the page):
1. Create a Strava API app at https://www.strava.com/settings/api. Set
   **Authorization Callback Domain** to the GitHub Pages domain
   (e.g. `matthias-chlechowitz.github.io`). Copy Client ID + Client Secret.
2. Deploy the `api/` folder to Vercel. Set env vars: `STRAVA_CLIENT_ID`,
   `STRAVA_CLIENT_SECRET`, `ALLOWED_ORIGIN` (the GitHub Pages origin).
3. In `index.html`, set `STRAVA_CLIENT_ID` and `STRAVA_PROXY_BASE` (the Vercel
   URL, no trailing slash). Both are non-secret. Until they're filled in, the
   card shows a "not configured" note and stays inert.

Notes: `read` scope only (public segments); default rate limits (100/15min,
1000/day) are fine for single-user use.

## Key values

- Weather/hike starting-point coordinates: `LAT = 46.9692377665258`,
  `LON = 11.009963531605568` (set explicitly by user — likely accommodation
  location, don't revert to the original Sölden-village default).
- Trip window: `TRIP_START = 2026-08-15`, `TRIP_END = 2026-08-27`.

## Deployment

GitHub Pages via `.github/workflows/static.yml` (Actions-based Pages deploy).
Repo: `matthias-chlechowitz/vacation`, pushed to GitHub with `main` as default
branch. Changes go through feature branches + PRs (see PR #1 for the
hike-of-the-day feature as an example of the pattern used so far).

## Constraints / don't re-litigate

- No backend, no build tooling, no persistence — deliberate, matches the
  scope of a single-user vacation tool. Don't introduce a bundler or framework
  for this.
- Cablecar/trail/bus stay as link-out cards, not scraped or faked data — no
  CORS-friendly API exists for them from a static site.
