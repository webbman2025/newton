import { NextResponse } from "next/server";
import { getHistory } from "@/lib/data";
import { locales, type Locale, type Mode } from "@/lib/translations";

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

    return NextResponse.json({ rows: await getHistory(mode, locale) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load history." },
      { status: 500 },
    );
  }
}
