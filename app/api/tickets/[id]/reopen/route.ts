import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createErrorResponse } from "@/lib/validators";
import { reopenTicket } from "@/lib/closure-service";

export async function POST(
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

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "A reason is required to reopen the ticket"),
        { status: 400 }
      );
    }

    const updated = await reopenTicket({
      ticketId: params.id,
      reason: reason.trim(),
      actor: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    });

    return NextResponse.json({ ticket: updated, message: "Ticket successfully reopened" });
  } catch (error) {
    console.error("POST /api/tickets/[id]/reopen error:", error);
    const message = error instanceof Error ? error.message : "Failed to reopen ticket";
    return NextResponse.json(
      createErrorResponse("REOPEN_ERROR", message),
      { status: 400 }
    );
  }
}
