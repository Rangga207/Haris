import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createErrorResponse } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        createErrorResponse("UNAUTHORIZED", "Authentication required"),
        { status: 401 }
      );
    }

    const [unreadCount, notifications] = await Promise.all([
      db.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
      db.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          ticket: {
            select: { id: true, ticketNo: true, status: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to fetch notifications"),
      { status: 500 }
    );
  }
}
