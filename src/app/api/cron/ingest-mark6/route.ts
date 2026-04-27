import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    job: "ingest-mark6",
    message: "Cron scaffold is active. Connect official feed ingestion logic here.",
  });
}
