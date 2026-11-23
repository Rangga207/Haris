import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus, Priority, Channel, AttachmentKind } from "@prisma/client";
import { createErrorResponse } from "@/lib/validators";
import { calculateSuggestedPriority } from "@/lib/priority";
import { generateTicketNumber } from "@/lib/ticket-no";
import { saveUploadedFile } from "@/lib/storage";
import { isOverdue } from "@/lib/overdue";
import { TERMINAL_STATUSES } from "@/lib/ticket-state";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        createErrorResponse("UNAUTHORIZED", "Authentication required"),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TicketStatus | null;
    const priority = searchParams.get("priority") as Priority | null;
    const categoryId = searchParams.get("categoryId");
    const buildingId = searchParams.get("buildingId");
    const search = searchParams.get("search");
    const overdueOnly = searchParams.get("overdue") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    // Build Prisma query condition based on role scoping
    const where: any = {};

    if (session.role === Role.REPORTER) {
      where.reporterId = session.userId;
    } else if (session.role === Role.TECHNICIAN) {
      where.assigneeId = session.userId;
    }
    // Admin and Unit Head see all tickets

    // Apply filters
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (buildingId) {
      where.buildingId = buildingId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { ticketNo: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { reporter: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    if (overdueOnly) {
      where.targetDate = { lt: new Date() };
      where.status = {
        notIn: [TicketStatus.RESOLVED, ...TERMINAL_STATUSES],
      };
    }

    const [total, tickets] = await Promise.all([
      db.ticket.count({ where }),
      db.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy:
          session.role === Role.ADMIN || session.role === Role.UNIT_HEAD
            ? [{ priority: "asc" }, { createdAt: "desc" }]
            : [{ createdAt: "desc" }],
        include: {
          reporter: { select: { id: true, name: true, email: true, phone: true } },
          assignee: { select: { id: true, name: true, specialization: true } },
          building: { select: { id: true, code: true, name: true } },
          room: { select: { id: true, name: true, floor: true } },
          category: { select: { id: true, name: true } },
          attachments: { select: { id: true, fileUrl: true, kind: true } },
          _count: { select: { statusHistory: true } },
        },
      }),
    ]);

    // Attach computed overdue flag
    const now = new Date();
    const enrichedTickets = tickets.map((t) => ({
      ...t,
      isOverdue: isOverdue(t.targetDate, t.status, now),
    }));

    return NextResponse.json({
      tickets: enrichedTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to fetch tickets"),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        createErrorResponse("UNAUTHORIZED", "Authentication required to submit ticket"),
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const buildingId = formData.get("buildingId") as string;
    const roomId = formData.get("roomId") as string;
    const categoryId = formData.get("categoryId") as string;
    const description = (formData.get("description") as string)?.trim();
    const isSafetyHazard = formData.get("isSafetyHazard") === "true";
    const channelInput = (formData.get("channel") as string) || Channel.WEB;
    const photoFile = formData.get("photo") as File | null;

    // Optional admin-on-behalf fields
    const reporterIdInput = formData.get("reporterId") as string | null;

    if (!buildingId || !roomId || !categoryId || !description) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Missing required fields"),
        { status: 400 }
      );
    }

    if (description.length < 5) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Description must be at least 5 characters long"),
        { status: 400 }
      );
    }

    // Determine reporter ID
    let reporterId = session.userId;
    if (session.role === Role.ADMIN && reporterIdInput) {
      reporterId = reporterIdInput;
    }

    // Lookup Category for default priority computation
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        createErrorResponse("NOT_FOUND", "Selected category not found"),
        { status: 404 }
      );
    }

    const calculatedPriority = calculateSuggestedPriority(category.name, isSafetyHazard);

    // If photo uploaded, validate and store
    let photoUploadResult: { url: string; size: number } | null = null;
    if (photoFile && photoFile.size > 0) {
      try {
        photoUploadResult = await saveUploadedFile(photoFile);
      } catch (uploadError) {
        return NextResponse.json(
          createErrorResponse(
            "FILE_UPLOAD_ERROR",
            uploadError instanceof Error ? uploadError.message : "File upload failed"
          ),
          { status: 400 }
        );
      }
    }

    // Atomic transaction for ticket creation & numbering
    const newTicket = await db.$transaction(async (tx) => {
      const ticketNo = await generateTicketNumber(tx);

      const ticket = await tx.ticket.create({
        data: {
          ticketNo,
          reporterId,
          createdById: session.userId,
          channel: (channelInput as Channel) || Channel.WEB,
          buildingId,
          roomId,
          categoryId,
          description,
          isSafetyHazard,
          priority: calculatedPriority,
          status: TicketStatus.SUBMITTED,
        },
      });

      // Save attachment if uploaded
      if (photoUploadResult) {
        await tx.ticketAttachment.create({
          data: {
            ticketId: ticket.id,
            uploadedById: session.userId,
            fileUrl: photoUploadResult.url,
            kind: AttachmentKind.BEFORE,
          },
        });
      }

      // Add status history entry
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: null,
          toStatus: TicketStatus.SUBMITTED,
          changedById: session.userId,
          note: isSafetyHazard ? "Ticket submitted with URGENT safety hazard alert" : "Ticket submitted via portal",
        },
      });

      // Notify admins if safety hazard
      if (isSafetyHazard) {
        const admins = await tx.user.findMany({
          where: { role: Role.ADMIN, isActive: true },
          select: { id: true },
        });

        for (const admin of admins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              ticketId: ticket.id,
              message: `⚠️ CRITICAL: Urgent safety hazard complaint filed: ${ticketNo}`,
            },
          });
        }
      }

      return ticket;
    });

    return NextResponse.json({ ticket: newTicket }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to create ticket"),
      { status: 500 }
    );
  }
}
