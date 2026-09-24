import { NextResponse } from "next/server";
import { getMark6HkjcScheduleSnapshot } from "@/lib/hkjc-mark6-schedule";
import { getUpcomingMark6DrawDates } from "@/lib/upcoming-mark6";
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
    const [upcoming, hkjc] = await Promise.all([
      getUpcomingMark6DrawDates(12),
      getMark6HkjcScheduleSnapshot(locale).catch(() => null),
    ]);

    const mergedDates = new Set(upcoming.dates);
    if (hkjc?.nextDraw?.drawDate) {
      mergedDates.add(hkjc.nextDraw.drawDate);
    }
    if (hkjc?.latestResult?.drawDate) {
      mergedDates.add(hkjc.latestResult.drawDate);
    }

    const today = new Date().toISOString().slice(0, 10);
    const dates = [...mergedDates].filter((date) => date >= today).sort().slice(0, 12);

    return NextResponse.json({
      dates,
      source: hkjc ? "hkjc" : upcoming.source,
      hkjc: hkjc
        ? {
            syncedAt: hkjc.syncedAt,
            latestResult: hkjc.latestResult,
            nextDraw: hkjc.nextDraw,
          }
        : undefined,
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
