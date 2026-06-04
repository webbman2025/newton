import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { ingestMarkSixFromWeb } from "@/lib/web-ingest";

export async function GET() {
  try {
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    const fromDate = from.toISOString().slice(0, 10);

    await ensureSchema();
    const mark6 = await ingestMarkSixFromWeb({ fromDate });

    return NextResponse.json({
      status: "ok",
      job: "ingest-mark6",
      fromDate,
      mark6,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to ingest Mark Six history.",
      },
      { status: 500 },
    );
  }
}
