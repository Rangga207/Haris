import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { isOverdue } from "@/lib/overdue";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        createErrorResponse("UNAUTHORIZED", "Authentication required"),
        { status: 401 }
      );
    }

    const ticket = await db.ticket.findUnique({
      where: { id: params.id },
      include: {
        reporter: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        assignee: { select: { id: true, name: true, specialization: true, phone: true } },
        building: { select: { id: true, code: true, name: true } },
        room: { select: { id: true, name: true, floor: true } },
        category: { select: { id: true, name: true, defaultPriority: true } },
        attachments: {
          select: { id: true, fileUrl: true, kind: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        assignments: {
          include: {
            technician: { select: { id: true, name: true, specialization: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        createErrorResponse("NOT_FOUND", "Ticket not found"),
        { status: 404 }
      );
    }

    // Role-based visibility scoping
    if (session.role === Role.REPORTER && ticket.reporterId !== session.userId) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "You can only view your own tickets"),
        { status: 403 }
      );
    }

    if (session.role === Role.TECHNICIAN && ticket.assigneeId !== session.userId) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "You can only view tickets assigned to you"),
        { status: 403 }
      );
    }

    const enrichedTicket = {
      ...ticket,
      isOverdue: isOverdue(ticket.targetDate, ticket.status),
    };

    return NextResponse.json({ ticket: enrichedTicket });
  } catch (error) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to retrieve ticket details"),
      { status: 500 }
    );
  }
}
