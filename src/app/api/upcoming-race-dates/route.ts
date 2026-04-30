import { NextResponse } from "next/server";
import { getUpcomingHorseRaceDates } from "@/lib/upcoming-race-dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const monthsAheadParam = Number.parseInt(searchParams.get("monthsAhead") ?? "", 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 120) : 30;
    const monthsAhead =
      Number.isFinite(monthsAheadParam) && monthsAheadParam > 0
        ? Math.min(monthsAheadParam, 12)
        : 6;
    const schedule = await getUpcomingHorseRaceDates(limit, monthsAhead);
    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load upcoming race dates.",
      },
      { status: 500 },
    );
  }
}
