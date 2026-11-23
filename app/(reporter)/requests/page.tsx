import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { STRINGS } from "@/lib/constants/strings";
import { StatusChip } from "@/components/ui/status-chip";
import { PriorityChip } from "@/components/ui/priority-chip";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusCircle, ExternalLink, Filter } from "lucide-react";
import { TicketStatus } from "@prisma/client";
import { isOverdue } from "@/lib/overdue";
import { format } from "date-fns";

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const statusFilter = searchParams.status as TicketStatus | undefined;

  const where: any = {
    reporterId: session.userId,
  };
  if (statusFilter && Object.values(TicketStatus).includes(statusFilter)) {
    where.status = statusFilter;
  }

  const tickets = await db.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      building: { select: { code: true, name: true } },
      room: { select: { name: true, floor: true } },
    },
  });

  const now = new Date();

  return (
    <AppShell user={session} pageTitle={STRINGS.myRequests.title}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">
              {STRINGS.myRequests.title}
            </h1>
            <p className="text-sm text-muted mt-1">
              {STRINGS.myRequests.subtitle}
            </p>
          </div>

          <Link
            href="/requests/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue hover:bg-blue-hover text-white text-sm font-semibold shadow-sm transition-colors w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{STRINGS.nav.newRequest}</span>
          </Link>
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-borderline shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-navy pl-1">
            <Filter className="w-3.5 h-3.5 text-blue" />
            <span>Filter:</span>
          </div>

          <Link
            href="/requests"
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !statusFilter
                ? "bg-blue text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {STRINGS.myRequests.allStatuses}
          </Link>

          {[
            TicketStatus.SUBMITTED,
            TicketStatus.ASSIGNED,
            TicketStatus.IN_PROGRESS,
            TicketStatus.ON_HOLD,
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
          ].map((st) => (
            <Link
              key={st}
              href={`/requests?status=${st}`}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-blue text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {STRINGS.status[st]}
            </Link>
          ))}
        </div>

        {/* Tickets Content: Table on Desktop, Cards on Mobile */}
        {tickets.length === 0 ? (
          <EmptyState
            title={STRINGS.myRequests.emptyTitle}
            description={STRINGS.myRequests.emptySubtitle}
            action={
              <Link
                href="/requests/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue text-white text-sm font-medium hover:bg-blue-hover shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                {STRINGS.myRequests.createFirstButton}
              </Link>
            }
          />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-borderline bg-white shadow-sm">
              <table className="min-w-full divide-y divide-borderline">
                <thead className="bg-canvas">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.ticketId}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.category}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.location}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.priority}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.status}
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.dateSubmitted}
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-navy uppercase tracking-wider">
                      {STRINGS.myRequests.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline bg-white text-sm">
                  {tickets.map((t) => {
                    const overdue = isOverdue(t.targetDate, t.status, now);
                    return (
                      <tr key={t.id} className="hover:bg-ice/15 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-blue">
                          {t.ticketNo}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-body">
                          {t.category.name}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-muted text-xs">
                          <span className="font-medium text-navy">{t.building.name}</span>
                          <span className="block">{t.room.name}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <PriorityChip priority={t.priority} isOverdue={overdue} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusChip status={t.status} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-muted text-xs">
                          {format(new Date(t.createdAt), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                          <Link
                            href={`/requests/${t.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:text-navy hover:underline"
                          >
                            <span>{STRINGS.myRequests.viewDetails}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {tickets.map((t) => {
                const overdue = isOverdue(t.targetDate, t.status, now);
                return (
                  <Card key={t.id} className="border-borderline p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue text-sm">
                        {t.ticketNo}
                      </span>
                      <StatusChip status={t.status} />
                    </div>

                    <div>
                      <h4 className="font-medium text-navy text-sm">
                        {t.category.name}
                      </h4>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-borderline">
                      <span>{t.building.code} • {t.room.name}</span>
                      <PriorityChip priority={t.priority} isOverdue={overdue} />
                    </div>

                    <Link
                      href={`/requests/${t.id}`}
                      className="block text-center py-2 px-3 rounded-md bg-canvas hover:bg-ice/20 text-xs font-semibold text-navy border border-borderline"
                    >
                      {STRINGS.myRequests.viewDetails}
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
