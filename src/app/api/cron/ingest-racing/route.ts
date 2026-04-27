import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    job: "ingest-racing",
    message: "Cron scaffold is active. Connect official race data ingestion logic here.",
  });
}
