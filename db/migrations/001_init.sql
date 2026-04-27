CREATE TABLE IF NOT EXISTS mark6_results (
  id BIGSERIAL PRIMARY KEY,
  draw_date DATE NOT NULL,
  numbers INTEGER[] NOT NULL,
  jackpot_amount NUMERIC(14, 2),
  source TEXT NOT NULL DEFAULT 'mock',
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS mark6_results_draw_date_idx
ON mark6_results (draw_date);

CREATE TABLE IF NOT EXISTS race_results (
  id BIGSERIAL PRIMARY KEY,
  race_date DATE NOT NULL,
  race_id TEXT NOT NULL,
  horse_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  jockey TEXT NOT NULL,
  trainer TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'mock',
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS race_results_unique_entry_idx
ON race_results (race_date, race_id, horse_name, position);

CREATE TABLE IF NOT EXISTS suggestion_logs (
  id BIGSERIAL PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('mark6', 'horse')),
  target_date DATE NOT NULL,
  input_snapshot JSONB NOT NULL,
  suggestion_payload JSONB NOT NULL,
  confidence_band TEXT NOT NULL CHECK (confidence_band IN ('Low', 'Medium', 'High')),
  model_version TEXT NOT NULL DEFAULT 'heuristic-v1',
  locale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
