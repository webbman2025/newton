# Deployment Guide (Vercel)

## 1) Prerequisites

- Vercel project connected to this repository
- **Vercel Postgres** (recommended — same dashboard as your app)
- Other environment variables below

**Billing note:** Vercel Postgres uses your **Vercel account/plan** (storage + compute). It does **not** use **Cursor tokens** or Cursor AI credits.

## 2) Vercel Postgres (recommended setup)

Do this once in the [Vercel dashboard](https://vercel.com/dashboard):

1. Open your **project** (this app).
2. Go to **Storage** → **Create Database** → **Postgres** → create (or pick an existing store).
3. **Connect** the database to this project. Vercel adds env vars automatically, mainly:
   - `POSTGRES_URL` (pooled — used by the app in production)
   - `POSTGRES_URL_NON_POOLING` (optional — for one-off CLI tools)
4. **Redeploy** Production (Deployments → … → Redeploy) so serverless functions see the new variables.

You do **not** need to copy the password into GitHub. Secrets stay on Vercel only.

**Tables:** On the first API request that needs the DB, the app runs `ensureSchema()` and creates tables (`mark6_results`, `race_results`, `suggestion_logs`). Manual `psql` migration is optional.

**Fill history:** After redeploy, open the live site → generate **Mark Six** and **Horse** picks once, or visit **History** (triggers ingest). Optional: set `ENABLE_WEB_INGEST=true` for cron backfill.

**Check:**

```bash
curl -s https://YOUR_APP.vercel.app/api/health
```

Look for `database.configured: true` and eventually `horseAnalyst.ready` / `mark6Expert.ready` after data ingests.

**Local dev with Vercel Postgres:** `vercel env pull .env.local` then use `POSTGRES_URL` from that file, or keep Docker Postgres and `DATABASE_URL` as in the README.

## 3) Environment Variables

Set these for both Preview and Production:

- `POSTGRES_URL` — **auto-set** when Vercel Postgres is linked (preferred on Vercel)
- `DATABASE_URL` — optional alias (local Docker); app accepts either `POSTGRES_URL` or `DATABASE_URL`
- `DATA_SOURCE_MODE`
- `HKJC_BASE_URL`
- `APP_ENV`
- `DISABLE_SUGGESTION_GENERATION` (unset or `false`)
- `ENABLE_ADMIN_SEED` (keep `false` in production)
- `ENABLE_WEB_INGEST` (`true` if you want scheduled cron ingestion; **not** required for analysts — horse generate triggers near-term HKJC ingest when the DB is still sparse)
- `SENTRY_DSN` (optional)
- `HORSE_ANALYST_STRATEGY` (optional, default `consensus` — all three README profiles blended)
- `HORSE_ANALYST_PROFILE` (optional, only when `HORSE_ANALYST_STRATEGY=single` — `pauljones` | `andygibson` | `topHandicapper`)
- `MARK6_EXPERT_STRATEGY` (optional, default `consensus` — all three Mark Six experts blended)
- `MARK6_EXPERT_PROFILE` (optional, only when `MARK6_EXPERT_STRATEGY=single` — `frequencyhistorian` | `momentumtracker` | `drawpatternspecialist`)
- `HISTORY_HORSE_INGEST_MAX_MEETING_DATES` (optional, default `4` — caps HKJC scraping on `/api/history*` so routes stay inside serverless time limits)
- `HISTORY_HORSE_SKIP_INGEST_MIN_DISTINCT` (optional, default `28` — skip read-path ingestion when DB already has this many distinct race aggregates; cron/full ingest can widen coverage)

### Agentic horse analysts on Vercel (wake on use)

The README analyst profiles are **not** separate AI bots. On each **Horse → upcoming day → generate** request, the app:

1. Uses `DATABASE_URL` and loads `race_results`
2. Runs a **small HKJC ingest** if the DB is still empty or thin (same path as History)
3. Scores runners with **consensus** weights (Paul Jones + Andy Gibson + Top Handicapper averaged) unless you set `HORSE_ANALYST_*` env vars

**Minimum setup:** Link **Vercel Postgres** (section 2), redeploy, then **Horse** → upcoming day → **generate**.

**Verify:**

```bash
curl -s https://YOUR_APP.vercel.app/api/health | jq .horseAnalyst
```

Expect `"ready": true` and `"horseRaceDistinct"` above 0 after the first successful horse generate (or History visit).

### Agentic Mark Six experts on Vercel (wake on use)

On each **Mark Six → generate** request the app:

1. Uses `DATABASE_URL` and loads `mark6_results` (ingests from the web if the table is still thin)
2. Blends **Frequency Historian**, **Momentum Tracker**, and **Draw Pattern Specialist** weights (unless `MARK6_EXPERT_*` env overrides)

**Verify:**

```bash
curl -s https://YOUR_APP.vercel.app/api/health | jq .mark6Expert
```

## 4) Database Setup (optional manual)

The app auto-creates schema via `ensureSchema()`. For manual setup or local Docker:

- `db/migrations/001_init.sql`
- Optional demo seed: `db/seeds/dev_seed.sql`

## 5) Vercel Configuration

- `vercel.json` defines:
  - serverless function sizing for suggestion API
  - cron routes for Mark Six and racing ingestion scaffolds

## 6) Validate Deployment

- Open `/api/health` and verify `status: ok`
- Open home/history/analytics routes on mobile viewport
- Confirm disclaimer appears on UI
- Confirm HKJC button opens external official portal

