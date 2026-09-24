import { NextResponse } from "next/server";
import { z } from "zod";
import {
  formatMajorJackpotHistoryNote,
  getMark6MajorJackpotHistory,
} from "@/lib/mark6-major-jackpot-history";
import { locales } from "@/lib/translations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locale: z.enum(locales).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    targetDate: searchParams.get("targetDate") ?? undefined,
    locale: searchParams.get("locale") ?? "en",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid major jackpot history parameters." }, { status: 400 });
  }

  try {
    const targetDate = parsed.data.targetDate ?? new Date().toISOString().slice(0, 10);
    const locale = parsed.data.locale ?? "en";
    const history = await getMark6MajorJackpotHistory(targetDate, locale);
    return NextResponse.json({
      ...history,
      note: formatMajorJackpotHistoryNote(history, locale),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load major jackpot Mark Six history.",
      },
      { status: 500 },
    );
  }
}
