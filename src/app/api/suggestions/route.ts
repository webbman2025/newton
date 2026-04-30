import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuggestion } from "@/lib/data";
import { locales } from "@/lib/translations";

export const runtime = "nodejs";

const bodySchema = z.object({
  mode: z.enum(["mark6", "horse"]),
  targetDate: z.string().min(10),
  locale: z.enum(locales),
  mark6PredictionType: z.enum(["single", "multiple", "banker"]).optional(),
  mark6BatchCount: z.number().int().min(1).max(12).optional(),
  mark6NumberMix: z.enum(["mixed", "smallOnly", "bigOnly"]).optional(),
  mark6GenerateMode: z.enum(["auto", "manual"]).optional(),
  mark6ManualNumbers: z.array(z.number().int().min(1).max(49)).max(49).optional(),
  horseAnalystStrategy: z.enum(["consensus", "single"]).optional(),
  horseAnalystProfile: z
    .enum(["paulJones", "andyGibson", "topHandicapper"])
    .optional(),
  selectedRace: z
    .object({
      venueCode: z.enum(["ST", "HV"]),
      venueName: z.string().min(1),
      raceNo: z.number().int().min(1).max(15),
      raceName: z.string().min(1),
      postTime: z.string().min(1),
      distance: z.number().int().min(200).max(4000).optional(),
      runners: z
        .array(
          z.object({
            horseNumber: z.number().int().min(0).max(99),
            horseName: z.string().min(1),
            jockey: z.string().min(1),
            trainer: z.string().min(1),
            draw: z.string().min(1),
            winOdds: z.string().min(1).optional(),
          }),
        )
        .min(1),
    })
    .optional(),
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
