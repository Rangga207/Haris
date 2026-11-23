import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const startTime = Date.now();

export async function GET() {
  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`;

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    return NextResponse.json({
      status: "ok",
      version: env.APP_VERSION,
      uptime: `${uptimeSeconds}s`,
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database failure:", error);
    return NextResponse.json(
      {
        status: "error",
        version: env.APP_VERSION,
        uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
        database: "disconnected",
        error: error instanceof Error ? error.message : "Database error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
