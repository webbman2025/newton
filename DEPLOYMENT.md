# Deployment Guide (Vercel)

## 1) Prerequisites

- Vercel project connected to this repository
- Managed PostgreSQL instance (Neon, Supabase, or equivalent)
- Environment variables configured in Vercel

## 2) Environment Variables

Set these for both Preview and Production:

- `DATABASE_URL` (**required** for agentic horse analysts on Vercel — without it, horse picks use demo fallback only)
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

**Minimum setup:**

1. Attach Neon/Supabase (or similar) and set `DATABASE_URL` on the Vercel project.
2. Run `db/migrations/001_init.sql` against that database once.
3. Redeploy, then open your Vercel URL → **Horse** → pick **today or a future** meeting → **generate**.

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

## 3) Database Setup

Run SQL migration:

- `db/migrations/001_init.sql`
- Optional local/demo seed:
  - `db/seeds/dev_seed.sql`

## 4) Vercel Configuration

- `vercel.json` defines:
  - serverless function sizing for suggestion API
  - cron routes for Mark Six and racing ingestion scaffolds

## 5) Validate Deployment

- Open `/api/health` and verify `status: ok`
- Open home/history/analytics routes on mobile viewport
- Confirm disclaimer appears on UI
- Confirm HKJC button opens external official portal

