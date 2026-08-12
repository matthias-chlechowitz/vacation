# Deployment

The **page** (`index.html`) is served by **GitHub Pages**. The **Strava OAuth2
proxy** (`api/*.mjs`) is served by **Vercel serverless functions**. They are two
separate deployments — GitHub Pages can't run the proxy (no secrets/backend),
and the page stays on Pages.

## 1. Create the Strava API app

1. Go to https://www.strava.com/settings/api.
2. Set **Authorization Callback Domain** to the **GitHub Pages** domain
   (e.g. `matthias-chlechowitz.github.io`) — this is where the OAuth redirect
   lands, **not** the Vercel URL.
3. Copy the **Client ID** and **Client Secret**.

## 2. Deploy the proxy to Vercel

Deploys from this repo; only the `api/*.mjs` functions are used. Point Vercel at
the `main` branch (merge the PR first) or temporarily set the production branch.

### Option A — Vercel dashboard (no install)

1. https://vercel.com → sign in with GitHub.
2. **Add New → Project** → import `matthias-chlechowitz/vacation`.
3. Framework preset: **Other**. Leave build command / output dir empty — the
   `api/` functions are auto-detected from `vercel.json`.
4. Add **Environment Variables** (see below), then **Deploy**.
5. You get a URL like `https://vacation-xxxx.vercel.app`.

### Option B — Vercel CLI

```sh
npm i -g vercel
vercel login
vercel                 # first run: interactive link/create project
vercel env add STRAVA_CLIENT_ID production
vercel env add STRAVA_CLIENT_SECRET production
vercel env add ALLOWED_ORIGIN production
vercel --prod          # promote to a stable production URL
```

### Environment variables

| Name                   | Value                                                        |
| ---------------------- | ------------------------------------------------------------ |
| `STRAVA_CLIENT_ID`     | Strava app Client ID                                         |
| `STRAVA_CLIENT_SECRET` | Strava app Client Secret (kept server-side only)             |
| `ALLOWED_ORIGIN`       | GitHub Pages origin, no trailing slash — e.g. `https://matthias-chlechowitz.github.io` (must match exactly for CORS) |

### Verify

`https://<your-vercel-url>/api/strava-segments` should return
`{"error":"Missing Bearer token"}` — that means the function is live (just
unauthenticated).

## 3. Wire the URLs into the page

In `index.html`, set the two non-secret config constants:

```js
const STRAVA_CLIENT_ID = "<your Strava Client ID>";
const STRAVA_PROXY_BASE = "https://<your-vercel-url>"; // no trailing slash
```

Commit and let GitHub Pages redeploy. Until both are filled in, the Strava card
shows a "not configured" note and stays inert.

## Notes

- `read` scope only (public segments).
- Default Strava rate limits (100 req/15 min, 1000/day) are fine for single-user
  use.
- Files under `api/` are `.mjs` so Vercel treats them as ES modules.
