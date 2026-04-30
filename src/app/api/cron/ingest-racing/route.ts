import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { ingestHorseRacingFromHkjc } from "@/lib/web-ingest";

export const runtime = "nodejs";

function isEnabled() {
  return process.env.ENABLE_WEB_INGEST === "true";
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getFromDate(daysBack: number) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - daysBack);
  return from.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  if (!isEnabled()) {
    return NextResponse.json(
      { error: "Web racing ingestion endpoint is disabled." },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysBack = Math.min(90, toPositiveInt(searchParams.get("daysBack"), 14));
    const maxMeetingDates = Math.min(120, toPositiveInt(searchParams.get("maxMeetingDates"), 16));
    const fromDate = getFromDate(daysBack);

    await ensureSchema();
    const horse = await ingestHorseRacingFromHkjc({ fromDate, maxMeetingDates });

    return NextResponse.json({
      status: "ok",
      job: "ingest-racing",
      fromDate,
      daysBack,
      maxMeetingDates,
      horse,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Horse racing cron ingestion failed.",
      },
      { status: 500 },
    );
  }
}
