import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { TicketStatus } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { transitionTicketStatus } from "@/lib/ticket-service";
import { saveUploadedFile } from "@/lib/storage";

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

    let toStatus: TicketStatus | undefined;
    let note: string | undefined;
    let reason: string | undefined;
    let afterPhotoUrl: string | undefined;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      toStatus = formData.get("status") as TicketStatus;
      note = (formData.get("note") as string) || undefined;
      reason = (formData.get("reason") as string) || undefined;
      const photo = formData.get("photo") as File | null;

      if (photo && photo.size > 0) {
        try {
          const uploadResult = await saveUploadedFile(photo);
          afterPhotoUrl = uploadResult.url;
        } catch (uploadErr) {
          return NextResponse.json(
            createErrorResponse(
              "FILE_UPLOAD_ERROR",
              uploadErr instanceof Error ? uploadErr.message : "Failed to upload photo"
            ),
            { status: 400 }
          );
        }
      }
    } else {
      const body = await request.json();
      toStatus = body.status as TicketStatus;
      note = body.note;
      reason = body.reason;
    }

    if (!toStatus || !Object.values(TicketStatus).includes(toStatus)) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "A valid target status is required"),
        { status: 400 }
      );
    }

    const updated = await transitionTicketStatus({
      ticketId: params.id,
      toStatus,
      note,
      reason,
      afterPhotoUrl,
      actor: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    console.error("POST /api/tickets/[id]/status error:", error);
    const message = error instanceof Error ? error.message : "Transition failed";
    const status = message.includes("not permitted") || message.includes("terminal") ? 409 : 400;
    return NextResponse.json(
      createErrorResponse("TRANSITION_ERROR", message),
      { status }
    );
  }
}
