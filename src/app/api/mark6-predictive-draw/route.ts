import { NextResponse } from "next/server";
import { z } from "zod";
import { getMark6PredictiveDraw } from "@/lib/mark6-predictive-engine";
import { mark6Personas } from "@/lib/mark6-analysis";
import { locales } from "@/lib/translations";

export const runtime = "nodejs";

const querySchema = z.object({
  targetDate: z.string().min(10).optional(),
  locale: z.enum(locales).optional(),
  persona: z.enum(mark6Personas).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      targetDate: url.searchParams.get("targetDate") ?? undefined,
      locale: url.searchParams.get("locale") ?? "en",
      persona: url.searchParams.get("persona") ?? "lotteryAnalyst",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const payload = await getMark6PredictiveDraw({
      targetDate: parsed.data.targetDate,
      locale: parsed.data.locale ?? "en",
      persona: parsed.data.persona,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to build Mark Six predictive draw.",
      },
      { status: 500 },
    );
  }
}
