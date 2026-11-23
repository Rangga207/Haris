import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketDetailView } from "@/components/features/ticket-detail-view";
import { TechnicianActionPanel } from "@/components/features/technician-action-panel";
import { isOverdue } from "@/lib/overdue";
import { ArrowLeft } from "lucide-react";

export default async function TechnicianJobWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || session.role !== Role.TECHNICIAN) {
    redirect("/login");
  }

  const ticket = await db.ticket.findUnique({
    where: { id: params.id },
    include: {
      reporter: { select: { id: true, name: true, email: true, phone: true } },
      assignee: { select: { id: true, name: true, specialization: true, phone: true } },
      building: { select: { id: true, code: true, name: true } },
      room: { select: { id: true, name: true, floor: true } },
      category: { select: { id: true, name: true } },
      attachments: {
        select: { id: true, fileUrl: true, kind: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      statusHistory: {
        include: { changedBy: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Technician scoping: only assigned tickets
  if (ticket.assigneeId !== session.userId) {
    redirect("/jobs");
  }

  const enrichedTicket = {
    ...ticket,
    isOverdue: isOverdue(ticket.targetDate, ticket.status),
  };

  return (
    <AppShell user={session} pageTitle={`Job ${ticket.ticketNo}`}>
      <div className="space-y-6">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Assigned Jobs</span>
          </Link>
        </div>

        <TicketDetailView
          ticket={enrichedTicket as any}
          actionSlot={
            <TechnicianActionPanel
              ticketId={ticket.id}
              status={ticket.status}
            />
          }
        />
      </div>
    </AppShell>
  );
}
