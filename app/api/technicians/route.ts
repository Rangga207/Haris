import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus } from "@prisma/client";
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

    if (session.role !== Role.ADMIN && session.role !== Role.UNIT_HEAD) {
      return NextResponse.json(
        createErrorResponse("FORBIDDEN", "Only staff can view technician workload"),
        { status: 403 }
      );
    }

    const technicians = await db.user.findMany({
      where: { role: Role.TECHNICIAN, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        specialization: true,
        assignedTickets: {
          where: {
            status: {
              in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.ON_HOLD],
            },
          },
          select: { id: true, priority: true, status: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const workloadList = technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      specialization: tech.specialization || "general",
      activeJobsCount: tech.assignedTickets.length,
      criticalJobsCount: tech.assignedTickets.filter((t) => t.priority === "CRITICAL").length,
    }));

    return NextResponse.json({ technicians: workloadList });
  } catch (error) {
    console.error("GET /api/technicians error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to retrieve technicians"),
      { status: 500 }
    );
  }
}
