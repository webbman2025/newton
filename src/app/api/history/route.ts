import { NextResponse } from "next/server";
import { getHistory } from "@/lib/data";
import { locales, type Locale, type Mode } from "@/lib/translations";

/** Always hit origin + DB ingest on read so horse History follows newly finished races without waiting for cron. */
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") as Mode) ?? "mark6";
    const localeParam = searchParams.get("locale") as Locale | null;
    const locale: Locale =
      localeParam && locales.includes(localeParam) ? localeParam : "en";

    if (mode !== "mark6" && mode !== "horse") {
      return NextResponse.json({ error: "Unsupported mode." }, { status: 400 });
    }

    const pastDaysRaw = searchParams.get("pastDays");
    let horsePastDays: number | undefined;
    if (mode === "horse" && pastDaysRaw !== null && pastDaysRaw !== "") {
      const parsed = Number.parseInt(pastDaysRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        horsePastDays = Math.min(parsed, 366);
      }
    }

    return NextResponse.json({
      rows: await getHistory(mode, locale, horsePastDays ? { horsePastDays } : undefined),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load history." },
      { status: 500 },
    );
  }
}
