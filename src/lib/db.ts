import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

let pool: Pool | null = null;
let schemaInitPromise: Promise<void> | null = null;

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const useSsl = !connectionString.includes("localhost");
  pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
  return pool;
}

export async function dbQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureSchema() {
  if (schemaInitPromise) {
    return schemaInitPromise;
  }

  schemaInitPromise = (async () => {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS mark6_results (
        id BIGSERIAL PRIMARY KEY,
        draw_date DATE NOT NULL,
        numbers INTEGER[] NOT NULL,
        jackpot_amount NUMERIC(14, 2),
        source TEXT NOT NULL DEFAULT 'mock',
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await dbQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS mark6_results_draw_date_idx
      ON mark6_results (draw_date);
    `);

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS race_results (
        id BIGSERIAL PRIMARY KEY,
        race_date DATE NOT NULL,
        race_id TEXT NOT NULL,
        race_course TEXT NOT NULL DEFAULT '',
        race_distance INTEGER,
        horse_number INTEGER NOT NULL DEFAULT 0,
        horse_name TEXT NOT NULL,
        horse_profile TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL,
        jockey TEXT NOT NULL,
        trainer TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'mock',
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await dbQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS race_results_unique_entry_idx
      ON race_results (race_date, race_id, horse_number, horse_name, position);
    `);

    await dbQuery(`
      ALTER TABLE race_results
      ADD COLUMN IF NOT EXISTS race_course TEXT NOT NULL DEFAULT '';
    `);

    await dbQuery(`
      ALTER TABLE race_results
      ADD COLUMN IF NOT EXISTS race_distance INTEGER;
    `);

    await dbQuery(`
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
    `);
  })();

  return schemaInitPromise;
}
