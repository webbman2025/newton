# Deployment Guide (Vercel)

## 1) Prerequisites

- Vercel project connected to this repository
- Managed PostgreSQL instance (Neon, Supabase, or equivalent)
- Environment variables configured in Vercel

## 2) Environment Variables

Set these for both Preview and Production:

- `DATABASE_URL`
- `DATA_SOURCE_MODE`
- `HKJC_BASE_URL`
- `APP_ENV`
- `DISABLE_SUGGESTION_GENERATION`
- `ENABLE_ADMIN_SEED` (keep `false` in production)
- `ENABLE_WEB_INGEST` (keep `false` by default; run manually when needed)
- `SENTRY_DSN` (optional)

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

