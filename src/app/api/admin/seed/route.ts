import { NextResponse } from "next/server";
import { ensureSchema, withTransaction } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const runtime = "nodejs";

function isSeedEnabled() {
  return process.env.ENABLE_ADMIN_SEED === "true";
}

export async function POST() {
  if (!isSeedEnabled()) {
    return NextResponse.json(
      { error: "Admin seed endpoint is disabled." },
      { status: 403 },
    );
  }

  try {
    await ensureSchema();
    const result = await withTransaction(async (client) => seedDatabase(client));
    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to seed database.",
      },
      { status: 500 },
    );
  }
}
