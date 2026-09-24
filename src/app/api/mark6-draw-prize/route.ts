import { NextResponse } from "next/server";
import { z } from "zod";
import { getMark6DrawPrizePayload } from "@/lib/mark6-draw-prize";
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
    return NextResponse.json({ error: "Invalid Mark Six prize parameters." }, { status: 400 });
  }

  try {
    const targetDate = parsed.data.targetDate ?? new Date().toISOString().slice(0, 10);
    const payload = await getMark6DrawPrizePayload(targetDate, parsed.data.locale ?? "en");
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load Mark Six draw prize.",
      },
      { status: 500 },
    );
  }
}
