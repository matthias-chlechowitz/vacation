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
