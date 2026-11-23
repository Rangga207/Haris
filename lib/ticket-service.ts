import { db } from "./db";
import { Role, TicketStatus, Priority, AttachmentKind } from "@prisma/client";
import { canTransition } from "./ticket-state";
import { calculateSuggestedPriority } from "./priority";
import { dispatchTicketNotifications, createNotification } from "./notifications";

export interface UpdatePriorityInput {
  ticketId: string;
  newPriority: Priority;
  reason?: string;
  actor: { id: string; name: string; role: Role };
}

export interface AssignTechnicianInput {
  ticketId: string;
  technicianId: string;
  targetDate: Date;
  note?: string;
  actor: { id: string; name: string; role: Role };
}

export interface TransitionStatusInput {
  ticketId: string;
  toStatus: TicketStatus;
  note?: string;
  reason?: string;
  afterPhotoUrl?: string;
  actor: { id: string; name: string; role: Role };
}

export async function updateTicketPriority(input: UpdatePriorityInput) {
  const { ticketId, newPriority, reason, actor } = input;

  if (actor.role !== Role.ADMIN) {
    throw new Error("Only administrators can update ticket priority.");
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { category: true, reporter: true },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  const suggestedPriority = calculateSuggestedPriority(
    ticket.category.name,
    ticket.isSafetyHazard
  );

  // Business Rule: If admin changes priority away from the suggested one, a reason is required.
  if (newPriority !== suggestedPriority && (!reason || reason.trim().length === 0)) {
    throw new Error(
      `A justification reason is required when departing from the suggested priority (${suggestedPriority}).`
    );
  }

  const oldPriority = ticket.priority;

  const updatedTicket = await db.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: { priority: newPriority },
    });

    const noteText = `Priority adjusted from ${oldPriority} to ${newPriority}${
      reason ? `. Justification: ${reason.trim()}` : ""
    }`;

    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus: ticket.status,
        changedById: actor.id,
        note: noteText,
      },
    });

    return updated;
  });

  // Notify reporter and assignee
  await createNotification({
    userId: ticket.reporterId,
    ticketId: ticket.id,
    message: `Ticket ${ticket.ticketNo} priority adjusted to ${newPriority}.`,
  });

  if (ticket.assigneeId) {
    await createNotification({
      userId: ticket.assigneeId,
      ticketId: ticket.id,
      message: `Assigned ticket ${ticket.ticketNo} priority adjusted to ${newPriority}.`,
    });
  }

  return updatedTicket;
}

export async function assignTechnician(input: AssignTechnicianInput) {
  const { ticketId, technicianId, targetDate, note, actor } = input;

  if (actor.role !== Role.ADMIN) {
    throw new Error("Only administrators can assign technicians.");
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { assignee: true, reporter: true },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  const technician = await db.user.findUnique({
    where: { id: technicianId },
  });

  if (!technician || technician.role !== Role.TECHNICIAN || !technician.isActive) {
    throw new Error("Selected user is not an active technician.");
  }

  const isReassignment = !!ticket.assigneeId && ticket.assigneeId !== technicianId;
  const previousAssigneeName = ticket.assignee?.name;

  const result = await db.$transaction(async (tx) => {
    // 1. Mark previous active assignment as unassigned
    if (ticket.assigneeId) {
      await tx.ticketAssignment.updateMany({
        where: { ticketId, technicianId: ticket.assigneeId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
    }

    // 2. Create new assignment record
    await tx.ticketAssignment.create({
      data: {
        ticketId,
        technicianId,
        assignedById: actor.id,
      },
    });

    // 3. Move status to ASSIGNED if previously SUBMITTED, TRIAGED, or REOPENED
    let newStatus = ticket.status;
    if (
      ticket.status === TicketStatus.SUBMITTED ||
      ticket.status === TicketStatus.TRIAGED ||
      ticket.status === TicketStatus.REOPENED
    ) {
      newStatus = TicketStatus.ASSIGNED;
    }

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: technicianId,
        targetDate,
        status: newStatus,
      },
    });

    // 4. Log history
    const historyNote = isReassignment
      ? `Reassigned from ${previousAssigneeName} to ${technician.name}. Target date: ${targetDate.toISOString().slice(0, 10)}${note ? `. Note: ${note.trim()}` : ""}`
      : `Assigned to ${technician.name}. Target date: ${targetDate.toISOString().slice(0, 10)}${note ? `. Note: ${note.trim()}` : ""}`;

    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus: newStatus,
        changedById: actor.id,
        note: historyNote,
      },
    });

    return updated;
  });

  // Notify technician
  await createNotification({
    userId: technicianId,
    ticketId: ticket.id,
    message: `You have been assigned to ticket ${ticket.ticketNo}. Target completion date: ${targetDate.toISOString().slice(0, 10)}.`,
  });

  // Notify reporter
  await createNotification({
    userId: ticket.reporterId,
    ticketId: ticket.id,
    message: `Ticket ${ticket.ticketNo} has been assigned to technician ${technician.name}.`,
  });

  return result;
}

export async function transitionTicketStatus(input: TransitionStatusInput) {
  const { ticketId, toStatus, note, reason, afterPhotoUrl, actor } = input;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { assignee: true, reporter: true },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  // 1. Check State Machine Validation
  const check = canTransition(ticket.status, toStatus, actor.role);
  if (!check.allowed) {
    throw new Error(check.reason || `Transition to ${toStatus} is not permitted.`);
  }

  const rule = check.rule;

  // 2. Technician scoping check: Technician must be current assignee
  if (actor.role === Role.TECHNICIAN) {
    if (ticket.assigneeId !== actor.id) {
      throw new Error("You can only update tickets assigned directly to you.");
    }
  }

  // 3. Validation for required notes / reasons
  const combinedNote = (reason || note || "").trim();

  if (rule?.requiresReason && !combinedNote) {
    throw new Error(`A reason is required when transitioning to ${toStatus}.`);
  }

  if (rule?.requiresNotes && !combinedNote) {
    throw new Error(`Completion notes are required when moving to ${toStatus}.`);
  }

  // 4. Execute atomic transaction
  const updatedTicket = await db.$transaction(async (tx) => {
    const updateData: any = {
      status: toStatus,
    };

    if (toStatus === TicketStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    } else if (toStatus === TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    } else if (toStatus === TicketStatus.ON_HOLD) {
      updateData.holdReason = combinedNote;
    } else if (toStatus === TicketStatus.IN_PROGRESS && ticket.status === TicketStatus.ON_HOLD) {
      updateData.holdReason = null;
    }

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Save after-photo attachment if provided
    if (afterPhotoUrl && toStatus === TicketStatus.RESOLVED) {
      await tx.ticketAttachment.create({
        data: {
          ticketId,
          uploadedById: actor.id,
          fileUrl: afterPhotoUrl,
          kind: AttachmentKind.AFTER,
        },
      });
    }

    // Append to status history (append-only)
    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus,
        changedById: actor.id,
        note: combinedNote || `Status updated to ${toStatus}`,
      },
    });

    return updated;
  });

  // 5. Dispatch in-app notifications
  await dispatchTicketNotifications({
    ticketNo: ticket.ticketNo,
    ticketId: ticket.id,
    fromStatus: ticket.status,
    toStatus,
    reporterId: ticket.reporterId,
    assigneeId: ticket.assigneeId,
    actorName: actor.name,
  });

  return updatedTicket;
}
