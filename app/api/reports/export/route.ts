import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { generateTicketsCsv, ExportTicketRow } from "@/lib/csv-export";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.UNIT_HEAD)) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only staff can export reports"),
        { status: 403 }
      );
    }

    const tickets = await db.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
        building: { select: { code: true, name: true } },
        room: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const exportRows: ExportTicketRow[] = tickets.map((t) => ({
      ticketNo: t.ticketNo,
      status: t.status,
      priority: t.priority,
      category: t.category.name,
      building: `${t.building.code} - ${t.building.name}`,
      room: t.room.name,
      channel: t.channel,
      reporterName: t.reporter.name,
      reporterEmail: t.reporter.email,
      assigneeName: t.assignee?.name || "Unassigned",
      isSafetyHazard: t.isSafetyHazard,
      createdAt: format(new Date(t.createdAt), "yyyy-MM-dd HH:mm:ss"),
      targetDate: t.targetDate ? format(new Date(t.targetDate), "yyyy-MM-dd") : "",
      resolvedAt: t.resolvedAt ? format(new Date(t.resolvedAt), "yyyy-MM-dd HH:mm:ss") : "",
      closedAt: t.closedAt ? format(new Date(t.closedAt), "yyyy-MM-dd HH:mm:ss") : "",
    }));

    const csvContent = generateTicketsCsv(exportRows);
    const dateStr = format(new Date(), "yyyyMMdd");
    const filename = `campusfix-tickets-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/reports/export error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to export tickets CSV"),
      { status: 500 }
    );
  }
}
