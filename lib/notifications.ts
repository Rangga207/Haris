import { db } from "./db";
import { Role } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  ticketId?: string;
  message: string;
}

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await db.notification.create({
      data: {
        userId: params.userId,
        ticketId: params.ticketId,
        message: params.message,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Sends notification to all active administrators.
 */
export async function notifyAdmins(message: string, ticketId?: string) {
  try {
    const admins = await db.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      ticketId,
      message,
    }));

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications,
      });
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}

/**
 * Dispatches contextual notifications based on ticket events.
 */
export async function dispatchTicketNotifications({
  ticketNo,
  ticketId,
  fromStatus,
  toStatus,
  reporterId,
  assigneeId,
  actorName,
}: {
  ticketNo: string;
  ticketId: string;
  fromStatus?: string | null;
  toStatus: string;
  reporterId: string;
  assigneeId?: string | null;
  actorName: string;
}) {
  const notifications: { userId: string; message: string; ticketId: string }[] = [];

  // 1. Notify reporter on status change
  notifications.push({
    userId: reporterId,
    ticketId,
    message: `Ticket ${ticketNo} status updated to ${toStatus} by ${actorName}.`,
  });

  // 2. Notify assignee if different from actor
  if (assigneeId) {
    notifications.push({
      userId: assigneeId,
      ticketId,
      message: `Job ${ticketNo} has been updated to ${toStatus}.`,
    });
  }

  // 3. Special event: NEEDS_INFO specifically alerts reporter
  if (toStatus === "NEEDS_INFO") {
    notifications.push({
      userId: reporterId,
      ticketId,
      message: `Action Required: Facilities admin requested more information regarding ticket ${ticketNo}.`,
    });
  }

  // 4. Special event: RESOLVED alerts reporter
  if (toStatus === "RESOLVED") {
    notifications.push({
      userId: reporterId,
      ticketId,
      message: `Ticket ${ticketNo} has been marked as RESOLVED. Please review and confirm closure.`,
    });
  }

  for (const n of notifications) {
    await createNotification(n);
  }
}
