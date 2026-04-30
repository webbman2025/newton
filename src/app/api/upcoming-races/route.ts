import { NextResponse } from "next/server";
import { getUpcomingRaces } from "@/lib/upcoming-races";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 80) : 40;
    const races = await getUpcomingRaces(limit);
    return NextResponse.json({ races });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load upcoming races.",
      },
      { status: 500 },
    );
  }
}
