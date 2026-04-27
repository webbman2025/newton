# Mobile Betting Assistant

Entertainment-only mobile web app for Mark Six and horse racing suggestions with bilingual support (`en`, `zh-HK`), history views, analytics-lite charts, and safe redirect to HKJC.

## Core Features

- Home flow: game toggle, date picker, progress updates, suggestion card
- History module for Mark Six and horse racing outcomes
- Analytics module with confidence distribution and trend charts
- Localized UI copy and disclaimers
- Vercel-ready API routes and cron scaffolds

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Local Postgres Setup

Option A (recommended) start local Postgres via Docker:

```bash
docker compose up -d
```

1. Copy env file and set connection:

```bash
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`, for example:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mobile_betting_assistant
```

Optional for admin seed endpoint:

```bash
ENABLE_ADMIN_SEED=true
```

2. Run migration and seed:

```bash
psql "$DATABASE_URL" -f db/migrations/001_init.sql
psql "$DATABASE_URL" -f db/seeds/dev_seed.sql
```

3. Start app:

```bash
npm run dev
```

4. Optional reseed via API (when `ENABLE_ADMIN_SEED=true`):

```bash
curl -X POST http://localhost:3000/api/admin/seed
```

## API Endpoints

- `POST /api/suggestions`
- `GET /api/history`
- `GET /api/analytics`
- `GET /api/health`

## Deploy

See `DEPLOYMENT.md` and `vercel.json`.
