import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";

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
      select: { reporterId: true, assigneeId: true },
    });

    if (!ticket) {
      return NextResponse.json(
        createErrorResponse("NOT_FOUND", "Ticket not found"),
        { status: 404 }
      );
    }

    // Check permissions
    if (session.role === Role.REPORTER && ticket.reporterId !== session.userId) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Access denied"),
        { status: 403 }
      );
    }

    if (session.role === Role.TECHNICIAN && ticket.assigneeId !== session.userId) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Access denied"),
        { status: 403 }
      );
    }

    const history = await db.ticketStatusHistory.findMany({
      where: { ticketId: params.id },
      include: {
        changedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("GET /api/tickets/[id]/history error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to retrieve status history"),
      { status: 500 }
    );
  }
}
