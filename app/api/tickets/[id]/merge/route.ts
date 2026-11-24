import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { mergeDuplicateTicket, findDuplicateTickets } from "@/lib/closure-service";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.UNIT_HEAD)) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Staff permission required"),
        { status: 403 }
      );
    }

    const ticket = await db.ticket.findUnique({
      where: { id: params.id },
      select: { roomId: true, categoryId: true },
    });

    if (!ticket) {
      return NextResponse.json(
        createErrorResponse("NOT_FOUND", "Ticket not found"),
        { status: 404 }
      );
    }

    const duplicates = await findDuplicateTickets({
      ticketId: params.id,
      roomId: ticket.roomId,
      categoryId: ticket.categoryId,
    });

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("GET /api/tickets/[id]/duplicates error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to check duplicates"),
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only administrators can merge tickets"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { primaryTicketId, reason } = body;

    if (!primaryTicketId) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Primary ticket ID is required"),
        { status: 400 }
      );
    }

    const merged = await mergeDuplicateTicket({
      ticketId: params.id,
      primaryTicketId,
      reason,
      actor: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    });

    return NextResponse.json({ ticket: merged, message: "Ticket merged successfully" });
  } catch (error) {
    console.error("POST /api/tickets/[id]/merge error:", error);
    const message = error instanceof Error ? error.message : "Failed to merge ticket";
    return NextResponse.json(
      createErrorResponse("MERGE_ERROR", message),
      { status: 400 }
    );
  }
}
