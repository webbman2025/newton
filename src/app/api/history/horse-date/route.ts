import { NextResponse } from "next/server";
import { getHorseHistoryByDate } from "@/lib/data";
import { locales, type Locale } from "@/lib/translations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get("date") ?? "";
    const localeParam = searchParams.get("locale") as Locale | null;
    const locale: Locale =
      localeParam && locales.includes(localeParam) ? localeParam : "en";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
    }

    return NextResponse.json({ rows: await getHorseHistoryByDate(targetDate, locale) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load horse history by date." },
      { status: 500 },
    );
  }
}
