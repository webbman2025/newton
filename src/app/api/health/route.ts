import { NextResponse } from "next/server";
import { dbQuery, hasDatabaseConfig } from "@/lib/db";

export const runtime = "nodejs";

function resolveHorseProfiles(strategy: "consensus" | "single", profileRaw: string) {
  if (strategy === "single") {
    if (profileRaw === "pauljones") return ["paulJones"];
    if (profileRaw === "andygibson") return ["andyGibson"];
    return ["topHandicapper"];
  }
  return ["paulJones", "andyGibson", "topHandicapper"];
}

function resolveMark6Profiles(strategy: "consensus" | "single", profileRaw: string) {
  if (strategy === "single") {
    if (profileRaw === "momentumtracker") return ["momentumTracker"];
    if (profileRaw === "drawpatternspecialist") return ["drawPatternSpecialist"];
    return ["frequencyHistorian"];
  }
  return ["frequencyHistorian", "momentumTracker", "drawPatternSpecialist"];
}

export async function GET() {
  const hasDatabase = hasDatabaseConfig();

  const horseStrategyRaw = (process.env.HORSE_ANALYST_STRATEGY ?? "consensus").toLowerCase();
  const horseStrategy = horseStrategyRaw === "single" ? "single" : "consensus";
  const horseProfileRaw = (process.env.HORSE_ANALYST_PROFILE ?? "topHandicapper").toLowerCase();

  const mark6StrategyRaw = (process.env.MARK6_EXPERT_STRATEGY ?? "consensus").toLowerCase();
  const mark6Strategy = mark6StrategyRaw === "single" ? "single" : "consensus";
  const mark6ProfileRaw = (process.env.MARK6_EXPERT_PROFILE ?? "frequencyHistorian").toLowerCase();

  let horseRaceDistinct = 0;
  let mark6DrawCount = 0;
  if (hasDatabase) {
    try {
      const horseRows = await dbQuery<{ races: number }>(
        `
        SELECT COUNT(DISTINCT (race_date::text || '|' || race_id))::int AS races
        FROM race_results
        WHERE race_id ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}-)?(ST|HV)-R[0-9]+$'
        `,
      );
      horseRaceDistinct = horseRows.rows[0]?.races ?? 0;
    } catch {
      horseRaceDistinct = 0;
    }

    try {
      const mark6Rows = await dbQuery<{ draws: number }>(
        `SELECT COUNT(*)::int AS draws FROM mark6_results`,
      );
      mark6DrawCount = mark6Rows.rows[0]?.draws ?? 0;
    } catch {
      mark6DrawCount = 0;
    }
  }

  const horseActiveProfiles = resolveHorseProfiles(horseStrategy, horseProfileRaw);
  const mark6ActiveProfiles = resolveMark6Profiles(mark6Strategy, mark6ProfileRaw);
  const horseAnalystReady = hasDatabase && horseRaceDistinct > 0;
  const mark6ExpertReady = hasDatabase && mark6DrawCount > 0;

  return NextResponse.json({
    status: "ok",
    service: "mobile-betting-assistant",
    horseAnalyst: {
      ready: horseAnalystReady,
      strategy: horseStrategy,
      activeProfiles: horseActiveProfiles,
      horseRaceDistinct,
      wakesOnHorseGenerate: hasDatabase,
      note: horseAnalystReady
        ? "Horse picks use analyst weight profiles on each /api/suggestions call."
        : hasDatabase
          ? "DATABASE_URL is set but race_results is empty — generate horse picks once to ingest."
          : "Link Vercel Postgres to this project (POSTGRES_URL) and redeploy.",
    },
    mark6Expert: {
      ready: mark6ExpertReady,
      strategy: mark6Strategy,
      activeProfiles: mark6ActiveProfiles,
      mark6DrawCount,
      wakesOnMark6Generate: hasDatabase,
      note: mark6ExpertReady
        ? "Mark Six picks use expert weight profiles on each /api/suggestions call."
        : hasDatabase
          ? "DATABASE_URL is set but mark6_results is empty — generate Mark Six once to ingest."
          : "Link Vercel Postgres to this project (POSTGRES_URL) and redeploy.",
    },
    database: {
      configured: hasDatabase,
      envHint: hasDatabase
        ? "Using POSTGRES_URL or DATABASE_URL (secrets stay on Vercel — not Cursor)."
        : "Create Storage → Postgres in Vercel and connect it to this project.",
    },
  });
}
