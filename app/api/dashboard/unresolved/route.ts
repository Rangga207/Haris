import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { TERMINAL_STATUSES } from "@/lib/ticket-state";
import { isOverdue } from "@/lib/overdue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.UNIT_HEAD)) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only staff can view unresolved tickets queue"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "age_desc"; // age_desc (oldest first) | priority

    const nonActive = [TicketStatus.RESOLVED, ...TERMINAL_STATUSES];

    const tickets = await db.ticket.findMany({
      where: {
        status: { notIn: nonActive },
      },
      orderBy:
        sort === "priority"
          ? [{ priority: "asc" }, { createdAt: "asc" }]
          : [{ createdAt: "asc" }], // oldest first
      include: {
        reporter: { select: { name: true } },
        assignee: { select: { name: true, specialization: true } },
        building: { select: { code: true } },
        room: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const now = new Date();
    const enriched = tickets.map((t) => {
      const ageHours = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);

      return {
        ...t,
        ageDays,
        ageHours,
        isOverdue: isOverdue(t.targetDate, t.status, now),
      };
    });

    return NextResponse.json({ tickets: enriched });
  } catch (error) {
    console.error("GET /api/dashboard/unresolved error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to retrieve unresolved tickets"),
      { status: 500 }
    );
  }
}
