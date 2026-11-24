import { db } from "./db";
import { TicketStatus, Role, Priority } from "@prisma/client";
import { canTransition } from "./ticket-state";
import { createNotification } from "./notifications";

export const AUTO_CLOSE_WINDOW_HOURS = 72; // 3 days

/**
 * Checks if a ticket in RESOLVED status is within the 3-day reopen window.
 */
export function isWithinReopenWindow(resolvedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!resolvedAt) return false;
  const resolvedTime = new Date(resolvedAt).getTime();
  const diffHours = (now.getTime() - resolvedTime) / (1000 * 60 * 60);
  return diffHours <= AUTO_CLOSE_WINDOW_HOURS;
}

/**
 * Reporter confirms resolution and moves ticket to CLOSED. Optionally saves feedback.
 */
export async function confirmTicketResolution({
  ticketId,
  actor,
  rating,
  comment,
}: {
  ticketId: string;
  actor: { id: string; name: string; role: Role };
  rating?: number;
  comment?: string;
}) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  // Reporter can only confirm their own tickets, Admin can also confirm
  if (actor.role === Role.REPORTER && ticket.reporterId !== actor.id) {
    throw new Error("You can only confirm resolution of your own tickets.");
  }

  if (ticket.status !== TicketStatus.RESOLVED) {
    throw new Error(`Cannot confirm ticket with status '${ticket.status}'. Must be in RESOLVED status.`);
  }

  const updatedTicket = await db.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    // Append to status history
    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: TicketStatus.RESOLVED,
        toStatus: TicketStatus.CLOSED,
        changedById: actor.id,
        note: "Reporter verified repair and confirmed ticket closure.",
      },
    });

    // Save feedback rating if provided
    if (rating && rating >= 1 && rating <= 5) {
      await tx.feedback.upsert({
        where: { ticketId },
        update: {
          rating,
          comment: comment?.trim() || null,
        },
        create: {
          ticketId,
          rating,
          comment: comment?.trim() || null,
        },
      });
    }

    return updated;
  });

  // Notify technician of confirmation
  if (ticket.assigneeId) {
    await createNotification({
      userId: ticket.assigneeId,
      ticketId: ticket.id,
      message: `Reporter confirmed completion and closed ticket ${ticket.ticketNo}.`,
    });
  }

  return updatedTicket;
}

/**
 * Reporter reopens ticket within 3-day window with reason.
 */
export async function reopenTicket({
  ticketId,
  reason,
  actor,
}: {
  ticketId: string;
  reason: string;
  actor: { id: string; name: string; role: Role };
}) {
  if (!reason || !reason.trim()) {
    throw new Error("A reason is required to reopen a resolved ticket.");
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  if (actor.role === Role.REPORTER && ticket.reporterId !== actor.id) {
    throw new Error("You can only reopen your own tickets.");
  }

  if (ticket.status !== TicketStatus.RESOLVED) {
    throw new Error(`Cannot reopen ticket with status '${ticket.status}'. Only RESOLVED tickets can be reopened.`);
  }

  if (!isWithinReopenWindow(ticket.resolvedAt)) {
    throw new Error("The 3-day reopen window has expired. Please submit a new ticket instead.");
  }

  const updatedTicket = await db.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.REOPENED,
      },
    });

    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: TicketStatus.RESOLVED,
        toStatus: TicketStatus.REOPENED,
        changedById: actor.id,
        note: `Reopened by reporter. Reason: ${reason.trim()}`,
      },
    });

    return updated;
  });

  // Notify admins that ticket has been reopened
  const admins = await db.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { id: true },
  });

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      ticketId: ticket.id,
      message: `Ticket ${ticket.ticketNo} has been reopened by reporter: "${reason.trim()}"`,
    });
  }

  return updatedTicket;
}

/**
 * Submits feedback rating (1-5) and comment for a ticket.
 */
export async function submitTicketFeedback({
  ticketId,
  rating,
  comment,
  actor,
}: {
  ticketId: string;
  rating: number;
  comment?: string;
  actor: { id: string; role: Role };
}) {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5.");
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  if (actor.role === Role.REPORTER && ticket.reporterId !== actor.id) {
    throw new Error("You can only submit feedback for your own tickets.");
  }

  return db.feedback.upsert({
    where: { ticketId },
    update: {
      rating,
      comment: comment?.trim() || null,
    },
    create: {
      ticketId,
      rating,
      comment: comment?.trim() || null,
    },
  });
}

/**
 * Finds potential duplicate open tickets in the same room and category.
 */
export async function findDuplicateTickets({
  ticketId,
  roomId,
  categoryId,
}: {
  ticketId: string;
  roomId: string;
  categoryId: string;
}) {
  return db.ticket.findMany({
    where: {
      id: { not: ticketId },
      roomId,
      categoryId,
      status: {
        in: [
          TicketStatus.SUBMITTED,
          TicketStatus.TRIAGED,
          TicketStatus.ASSIGNED,
          TicketStatus.IN_PROGRESS,
          TicketStatus.ON_HOLD,
        ],
      },
    },
    include: {
      reporter: { select: { name: true } },
      category: { select: { name: true } },
      building: { select: { code: true } },
      room: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Merges a secondary ticket into a primary ticket (Admin only).
 * Transition: SUBMITTED -> MERGED.
 */
export async function mergeDuplicateTicket({
  ticketId,
  primaryTicketId,
  reason,
  actor,
}: {
  ticketId: string;
  primaryTicketId: string;
  reason?: string;
  actor: { id: string; name: string; role: Role };
}) {
  if (actor.role !== Role.ADMIN) {
    throw new Error("Only administrators can merge duplicate tickets.");
  }

  if (ticketId === primaryTicketId) {
    throw new Error("Cannot merge a ticket into itself.");
  }

  const [secondary, primary] = await Promise.all([
    db.ticket.findUnique({ where: { id: ticketId } }),
    db.ticket.findUnique({ where: { id: primaryTicketId } }),
  ]);

  if (!secondary) throw new Error("Secondary ticket not found.");
  if (!primary) throw new Error("Primary ticket not found.");

  if (secondary.status !== TicketStatus.SUBMITTED) {
    throw new Error(`Only SUBMITTED tickets can be merged. Current status is ${secondary.status}.`);
  }

  const updatedTicket = await db.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.MERGED,
        parentTicketId: primaryTicketId,
      },
    });

    const mergeNote = `Merged as duplicate into primary ticket ${primary.ticketNo}.${
      reason ? ` Reason: ${reason.trim()}` : ""
    }`;

    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: TicketStatus.SUBMITTED,
        toStatus: TicketStatus.MERGED,
        changedById: actor.id,
        note: mergeNote,
      },
    });

    return updated;
  });

  // Notify reporter of secondary ticket
  await createNotification({
    userId: secondary.reporterId,
    ticketId: secondary.id,
    message: `Your ticket ${secondary.ticketNo} has been merged into primary ticket ${primary.ticketNo}. Progress will be tracked there.`,
  });

  return updatedTicket;
}

/**
 * Auto-closes tickets that have remained in RESOLVED status for more than 72 hours.
 */
export async function autoCloseResolvedTickets(systemActorId?: string) {
  const threeDaysAgo = new Date(Date.now() - AUTO_CLOSE_WINDOW_HOURS * 60 * 60 * 1000);

  const eligibleTickets = await db.ticket.findMany({
    where: {
      status: TicketStatus.RESOLVED,
      resolvedAt: { lte: threeDaysAgo },
    },
    select: { id: true, ticketNo: true, reporterId: true },
  });

  let closedCount = 0;
  const closedTicketIds: string[] = [];

  for (const t of eligibleTickets) {
    try {
      await db.$transaction(async (tx) => {
        await tx.ticket.update({
          where: { id: t.id },
          data: {
            status: TicketStatus.CLOSED,
            closedAt: new Date(),
          },
        });

        await tx.ticketStatusHistory.create({
          data: {
            ticketId: t.id,
            fromStatus: TicketStatus.RESOLVED,
            toStatus: TicketStatus.CLOSED,
            changedById: systemActorId || t.reporterId,
            note: "System auto-closed ticket after 3 days with no reporter dispute.",
          },
        });
      });

      await createNotification({
        userId: t.reporterId,
        ticketId: t.id,
        message: `Ticket ${t.ticketNo} has been automatically closed after 3 days of resolution.`,
      });

      closedCount++;
      closedTicketIds.push(t.id);
    } catch (err) {
      console.error(`Failed to auto-close ticket ${t.id}:`, err);
    }
  }

  return { closedCount, closedTicketIds };
}
