import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createErrorResponse } from "@/lib/validators";
import { submitTicketFeedback } from "@/lib/closure-service";

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
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Rating must be between 1 and 5"),
        { status: 400 }
      );
    }

    const feedback = await submitTicketFeedback({
      ticketId: params.id,
      rating: parseInt(rating, 10),
      comment,
      actor: {
        id: session.userId,
        role: session.role,
      },
    });

    return NextResponse.json({ feedback, message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("POST /api/tickets/[id]/feedback error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit feedback";
    return NextResponse.json(
      createErrorResponse("FEEDBACK_ERROR", message),
      { status: 400 }
    );
  }
}
