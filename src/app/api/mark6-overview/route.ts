import { NextResponse } from "next/server";
import { getSuggestion } from "@/lib/data";
import { dbQuery, ensureSchema } from "@/lib/db";
import { locales, type Locale } from "@/lib/translations";

export const runtime = "nodejs";

async function getFiveYearAppearanceCounts(targetDate: string) {
  try {
    await ensureSchema();
    const endDate = new Date(targetDate);
    const validEndDate = Number.isNaN(endDate.getTime()) ? new Date() : endDate;
    const startDate = new Date(validEndDate);
    startDate.setFullYear(validEndDate.getFullYear() - 5);

    const rows = await dbQuery<{ number: number; count: string }>(
      `
      SELECT drawn_number.number, COUNT(*)::text AS count
      FROM mark6_results
      CROSS JOIN LATERAL UNNEST(numbers) AS drawn_number(number)
      WHERE draw_date BETWEEN $1::date AND $2::date
      GROUP BY drawn_number.number
      `,
      [
        startDate.toISOString().slice(0, 10),
        validEndDate.toISOString().slice(0, 10),
      ],
    );

    return new Map(
      rows.rows.map((row) => [
        row.number,
        Number.parseInt(row.count, 10) || 0,
      ]),
    );
  } catch {
    return new Map<number, number>();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const localeParam = searchParams.get("locale") as Locale | null;
    const locale: Locale =
      localeParam && locales.includes(localeParam) ? localeParam : "en";
    const targetDate =
      searchParams.get("targetDate") ?? new Date().toISOString().slice(0, 10);

    const payload = await getSuggestion({
      mode: "mark6",
      targetDate,
      locale,
      mark6PredictionType: "single",
      mark6BatchCount: 1,
      mark6NumberMix: "mixed",
      mark6GenerateMode: "auto",
    });

    const appearanceCounts = await getFiveYearAppearanceCounts(targetDate);
    const byNumber = new Map(
      (payload.mark6NumberProbabilities ?? []).map((item) => [
        item.number,
        item.probability,
      ]),
    );
    const probabilities = Array.from({ length: 49 }, (_value, index) => {
      const number = index + 1;
      return {
        number,
        probability: byNumber.get(number) ?? 0,
        fiveYearAppearances: appearanceCounts.get(number) ?? 0,
      };
    });

    return NextResponse.json({
      targetDate,
      previousDraw: payload.mark6PreviousDraw,
      probabilities,
      modelVersion: payload.modelVersion,
      explanation: payload.explanation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Mark Six overview.",
      },
      { status: 500 },
    );
  }
}
