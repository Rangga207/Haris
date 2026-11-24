import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus, Priority } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { TERMINAL_STATUSES } from "@/lib/ticket-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.UNIT_HEAD)) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only administrators and unit heads can access analytics"),
        { status: 403 }
      );
    }

    const now = new Date();
    const closedOrResolved = [TicketStatus.RESOLVED, ...TERMINAL_STATUSES];

    const [
      totalTickets,
      openTicketsCount,
      overdueCount,
      criticalOpenCount,
      ticketsByStatus,
      ticketsByPriority,
      buildings,
      feedbackAgg,
    ] = await Promise.all([
      db.ticket.count(),
      db.ticket.count({
        where: { status: { notIn: closedOrResolved } },
      }),
      db.ticket.count({
        where: {
          targetDate: { lt: now },
          status: { notIn: closedOrResolved },
        },
      }),
      db.ticket.count({
        where: {
          priority: Priority.CRITICAL,
          status: { notIn: closedOrResolved },
        },
      }),
      db.ticket.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      db.ticket.groupBy({
        by: ["priority"],
        _count: { _all: true },
      }),
      db.building.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          _count: { select: { tickets: true } },
        },
        orderBy: { code: "asc" },
      }),
      db.feedback.aggregate({
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const item of ticketsByStatus) {
      statusMap[item.status] = item._count._all;
    }

    const priorityMap: Record<string, number> = {};
    for (const item of ticketsByPriority) {
      priorityMap[item.priority] = item._count._all;
    }

    const buildingData = buildings.map((b) => ({
      name: b.code,
      fullName: b.name,
      count: b._count.tickets,
    }));

    return NextResponse.json({
      summary: {
        totalTickets,
        totalOpen: openTicketsCount,
        overdueCount,
        criticalOpenCount,
        averageRating: feedbackAgg._avg.rating ? Number(feedbackAgg._avg.rating.toFixed(1)) : 5.0,
        totalFeedbacks: feedbackAgg._count._all,
      },
      statusDistribution: statusMap,
      priorityDistribution: priorityMap,
      buildingDistribution: buildingData,
    });
  } catch (error) {
    console.error("GET /api/dashboard/summary error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to retrieve dashboard metrics"),
      { status: 500 }
    );
  }
}
