import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuggestion } from "@/lib/data";
import { locales } from "@/lib/translations";

export const runtime = "nodejs";

const bodySchema = z.object({
  mode: z.enum(["mark6", "horse"]),
  targetDate: z.string().min(10),
  locale: z.enum(locales),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 },
      );
    }

    const response = await getSuggestion(parsed.data);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate suggestions.",
      },
      { status: 500 },
    );
  }
}
