# Mobile Betting Assistant

Entertainment-only mobile web app for Mark Six and horse racing suggestions with bilingual support (`en`, `zh-HK`), history views, analytics-lite charts, and safe redirect to HKJC.

## Core Features

- Home flow: game toggle, date picker, progress updates, suggestion card
- History module for Mark Six and horse racing outcomes
- Analytics module with confidence distribution and trend charts
- Localized UI copy and disclaimers
- Vercel-ready API routes and cron scaffolds

## Agentic Horse Racing Analyst Profiles

These profiles define the intended analysis style for horse-racing educational insights. On **Vercel**, they run automatically when you generate **horse** picks for an **upcoming** race day — link **Vercel Postgres** (see `DEPLOYMENT.md`). Check `/api/health` → `horseAnalyst.ready`.

1. **Paul Jones**
   - Specialty: Cheltenham Festival and big-race trends
   - Track Record: Author of 40+ racing books, including the Cheltenham Festival Betting Guide
   - Highlights: Recommended huge-priced winners like Rule The World (50/1 Grand National) and Wings Of Eagles (40/1 Derby)
   - Style: Combines historical trends with betting angles, offering structured previews and weekly columns

2. **Andy Gibson**
   - Specialty: Cheltenham Festival, sectional timing, pace analysis
   - Experience: Over 30 years of racing observation; frequent TV pundit for At The Races, RUK, and William Hill Radio
   - Unique Approach: His “Eyecatchers” service identifies horses overlooked by the crowd, using time comparisons and pace breakdowns to spot undervalued runners

3. **Top Handicappers (General)**
   - Role: Analyze past performances, speed figures, track conditions, and competition quality
   - Qualities: Deep racing knowledge, strong analytical skills, objectivity in predictions, and years of experience adapting to trends
   - Influence: Insights used by bettors, racing publications, and trainers to optimize race strategies

## Agentic Mark Six Expert Profiles

These profiles blend different signal weights on each Mark Six generate (default **consensus** = all three averaged). Not separate AI bots — statistical tuning only.

1. **Frequency Historian**
   - Emphasis: long-horizon draw frequency and trained logistic model lift
   - Style: stable historical baselines, lighter neighbour-of-last-draw boosts

2. **Momentum Tracker**
   - Emphasis: seasonal / same-day-month temporal boosts and recent-model lift
   - Style: cyclical and holiday-window sensitivity

3. **Draw Pattern Specialist**
   - Emphasis: previous-draw neighbours (±1/±2), mirror numbers (50−n), decade bands
   - Style: pattern-following after the latest official result

On **Vercel**, experts run when you generate **Mark Six** picks with **Vercel Postgres** linked. Check `/api/health` → `mark6Expert.ready`. Optional env: `MARK6_EXPERT_STRATEGY`, `MARK6_EXPERT_PROFILE` (see `DEPLOYMENT.md`).

## Quick Start

### Production (Vercel — what you use day to day)

Open your deployed site, for example `https://<your-project>.vercel.app` (find it in the Vercel dashboard → **Domains**). The live app never points users at `localhost`.

### Local development only

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` on the machine where you ran `npm run dev`. Cursor’s preview or “Open in Browser” after `npm run dev` also uses this URL — that is expected for local work, not your Vercel deployment.

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
ENABLE_WEB_INGEST=true
```

Horse names and profiles in this starter are sample profile entries for demo/testing. Replace seed rows with official HKJC card data in your ingestion jobs for live use.

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

5. Optional web history ingestion (when `ENABLE_WEB_INGEST=true`):

```bash
curl -X POST http://localhost:3000/api/admin/ingest-history \
  -H "Content-Type: application/json" \
  -d '{"years":5,"maxMeetingDates":120}'
```

Notes:
- Mark Six source: `en.lottolyzer.com` history table
- Horse racing source: `racing.hkjc.com` local results pages
- `maxMeetingDates` controls runtime and can be increased in batches

## API Endpoints

- `POST /api/suggestions`
- `GET /api/history`
  - Horse mode: optional `pastDays=N` limits results to HK calendar dates from _(today − (N−1))_ through today (inclusive); omit for the full capped list served to legacy callers (e.g. home overview).
- `GET /api/analytics`
- `GET /api/health`

## Deploy

See `DEPLOYMENT.md` and `vercel.json`. After deploy, use your **Vercel URL** for the app and for checks such as `/api/health` — not `localhost`.
