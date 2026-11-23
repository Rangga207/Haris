import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Role, Priority } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { updateTicketPriority } from "@/lib/ticket-service";

export async function PATCH(
  request: NextRequest,
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

    if (session.role !== Role.ADMIN) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only administrators can change priority"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { priority, reason } = body;

    if (!priority || !Object.values(Priority).includes(priority)) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Invalid priority value"),
        { status: 400 }
      );
    }

    const updated = await updateTicketPriority({
      ticketId: params.id,
      newPriority: priority as Priority,
      reason,
      actor: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    console.error("PATCH /api/tickets/[id]/priority error:", error);
    const message = error instanceof Error ? error.message : "Failed to update priority";
    return NextResponse.json(
      createErrorResponse("PRIORITY_UPDATE_ERROR", message),
      { status: 400 }
    );
  }
}
