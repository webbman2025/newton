import { NextResponse } from "next/server";
import {
  getHkjcSelectableDrawDates,
  getMark6HkjcScheduleSnapshot,
} from "@/lib/hkjc-mark6-schedule";
import { locales } from "@/lib/translations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale");
  const locale = locales.includes(localeParam as (typeof locales)[number])
    ? (localeParam as (typeof locales)[number])
    : "en";

  try {
    const hkjc = await getMark6HkjcScheduleSnapshot(locale).catch(() => null);

    if (hkjc) {
      const dates = getHkjcSelectableDrawDates(hkjc);
      return NextResponse.json({
        dates,
        source: "hkjc" as const,
        hkjc: {
          syncedAt: hkjc.syncedAt,
          latestResult: hkjc.latestResult,
          nextDraw: hkjc.nextDraw,
          prizesByDate: hkjc.byDate,
        },
      });
    }

    return NextResponse.json({
      dates: [] as string[],
      source: "unavailable" as const,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load upcoming Mark Six draw dates.",
      },
      { status: 500 },
    );
  }
}
