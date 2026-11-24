import { NextRequest, NextResponse } from "next/server";
import { autoCloseResolvedTickets } from "@/lib/closure-service";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Protected cron endpoint to auto-close tickets that have been in RESOLVED status for >= 72 hours.
 * Triggered by: cron job, system worker, or manually by Admin.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authorization via Bearer token (cron header) or Admin session
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "campusfix-cron-internal-secret";

    let isAuthorized = false;
    let actorId: string | undefined;

    if (authHeader && authHeader.replace("Bearer ", "") === cronSecret) {
      isAuthorized = true;
    } else {
      const session = await getSession();
      if (session && session.role === Role.ADMIN) {
        isAuthorized = true;
        actorId = session.userId;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Invalid cron credentials" },
        { status: 401 }
      );
    }

    const result = await autoCloseResolvedTickets(actorId);

    return NextResponse.json({
      success: true,
      message: `Successfully auto-closed ${result.closedCount} resolved tickets.`,
      closedCount: result.closedCount,
      ticketIds: result.closedTicketIds,
    });
  } catch (error) {
    console.error("Auto-close cron job error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Auto-close failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
