import { NextResponse } from "next/server";
import { getLatestMark6PreviousDraw } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get("targetDate") ?? undefined;
    const previousDraw = await getLatestMark6PreviousDraw(targetDate);
    return NextResponse.json({ previousDraw });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load latest Mark Six result.",
      },
      { status: 500 },
    );
  }
}
