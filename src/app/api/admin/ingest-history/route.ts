import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema } from "@/lib/db";
import {
  ingestHorseRacingFromHkjc,
  ingestMarkSixFromWeb,
} from "@/lib/web-ingest";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    years: z.number().int().min(1).max(8).optional(),
    maxMeetingDates: z.number().int().min(5).max(500).optional(),
  })
  .optional();

function isEnabled() {
  return process.env.ENABLE_WEB_INGEST === "true";
}

function getFromDate(years: number) {
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(now.getFullYear() - years);
  return from.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!isEnabled()) {
    return NextResponse.json(
      { error: "Web history ingestion endpoint is disabled." },
      { status: 403 },
    );
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const years = parsed.data?.years ?? 5;
    const maxMeetingDates = parsed.data?.maxMeetingDates ?? 80;
    const fromDate = getFromDate(years);
    await ensureSchema();

    const [mark6, horse] = await Promise.all([
      ingestMarkSixFromWeb({ fromDate }),
      ingestHorseRacingFromHkjc({ fromDate, maxMeetingDates }),
    ]);

    return NextResponse.json({
      status: "ok",
      fromDate,
      years,
      sources: {
        markSix: "lottolyzer.com",
        horseRacing: "racing.hkjc.com",
      },
      mark6,
      horse,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? (error.message || "Web ingestion failed with an empty error message.")
        : "Web ingestion failed with a non-standard error.";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
