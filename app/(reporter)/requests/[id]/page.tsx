import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketDetailView } from "@/components/features/ticket-detail-view";
import { ReporterReplyPanel } from "@/components/features/reporter-reply-panel";
import { ClosureFeedbackPanel } from "@/components/features/closure-feedback-panel";
import { isOverdue } from "@/lib/overdue";
import { ArrowLeft } from "lucide-react";

export default async function ReporterTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
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
      feedback: true,
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

  // Reporter can only see their own tickets
  if (session.role === Role.REPORTER && ticket.reporterId !== session.userId) {
    redirect("/requests");
  }

  const enrichedTicket = {
    ...ticket,
    isOverdue: isOverdue(ticket.targetDate, ticket.status),
  };

  // Find latest admin note for NEEDS_INFO if applicable
  const latestNeedsInfoRow = ticket.statusHistory
    .slice()
    .reverse()
    .find((h) => h.toStatus === TicketStatus.NEEDS_INFO);

  return (
    <AppShell user={session} pageTitle={`Ticket ${ticket.ticketNo}`}>
      <div className="space-y-6">
        <div>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Requests</span>
          </Link>
        </div>

        <TicketDetailView
          ticket={enrichedTicket as any}
          actionSlot={
            ticket.status === TicketStatus.NEEDS_INFO ? (
              <ReporterReplyPanel
                ticketId={ticket.id}
                status={ticket.status}
                latestNote={latestNeedsInfoRow?.note}
              />
            ) : ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED ? (
              <ClosureFeedbackPanel
                ticketId={ticket.id}
                status={ticket.status}
                resolvedAt={ticket.resolvedAt}
                existingFeedback={ticket.feedback}
              />
            ) : null
          }
        />
      </div>
    </AppShell>
  );
}
