import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMark6Analysis,
  mark6AnalysisQueries,
  mark6Personas,
} from "@/lib/mark6-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  persona: z.enum(mark6Personas).default("lotteryAnalyst"),
  query: z.enum(mark6AnalysisQueries).default("hotCold"),
  window: z.coerce.number().int().min(10).max(100).default(50),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    persona: searchParams.get("persona") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    window: searchParams.get("window") ?? undefined,
    targetDate: searchParams.get("targetDate") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Mark Six analysis parameters." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await getMark6Analysis(parsed.data));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze Mark Six history.",
      },
      { status: 500 },
    );
  }
}
