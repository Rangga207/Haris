import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createErrorResponse } from "@/lib/validators";
import { confirmTicketResolution } from "@/lib/closure-service";

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

    const body = await request.json().catch(() => ({}));
    const { rating, comment } = body;

    const updated = await confirmTicketResolution({
      ticketId: params.id,
      rating: rating ? parseInt(rating, 10) : undefined,
      comment,
      actor: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    });

    return NextResponse.json({ ticket: updated, message: "Ticket marked as closed" });
  } catch (error) {
    console.error("POST /api/tickets/[id]/confirm error:", error);
    const message = error instanceof Error ? error.message : "Failed to confirm ticket";
    return NextResponse.json(
      createErrorResponse("CONFIRM_ERROR", message),
      { status: 400 }
    );
  }
}
