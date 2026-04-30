import { NextResponse } from "next/server";
import { getUpcomingMark6DrawDates } from "@/lib/upcoming-mark6";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await getUpcomingMark6DrawDates(12);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load upcoming Mark Six draw dates.",
      },
      { status: 500 },
    );
  }
}
