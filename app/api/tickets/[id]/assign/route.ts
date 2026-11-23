import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { assignTechnician } from "@/lib/ticket-service";

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

    if (session.role !== Role.ADMIN) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only administrators can assign technicians"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { technicianId, targetDate, note } = body;

    if (!technicianId || !targetDate) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Technician and target date are required"),
        { status: 400 }
      );
    }

    const parsedTargetDate = new Date(targetDate);
    if (isNaN(parsedTargetDate.getTime())) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Invalid target date format"),
        { status: 400 }
      );
    }

    const updated = await assignTechnician({
      ticketId: params.id,
      technicianId,
      targetDate: parsedTargetDate,
      note,
      actor: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    console.error("POST /api/tickets/[id]/assign error:", error);
    const message = error instanceof Error ? error.message : "Failed to assign technician";
    return NextResponse.json(
      createErrorResponse("ASSIGNMENT_ERROR", message),
      { status: 400 }
    );
  }
}
