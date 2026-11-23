import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus, Priority } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { STRINGS } from "@/lib/constants/strings";
import { StatusChip } from "@/components/ui/status-chip";
import { PriorityChip } from "@/components/ui/priority-chip";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Filter, AlertCircle, ExternalLink, PlusCircle } from "lucide-react";
import { isOverdue } from "@/lib/overdue";
import { TERMINAL_STATUSES } from "@/lib/ticket-state";
import { format } from "date-fns";

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    priority?: string;
    category?: string;
    building?: string;
    search?: string;
    overdue?: string;
  };
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.UNIT_HEAD)) {
    redirect("/login");
  }

  const { status, priority, category, building, search, overdue } = searchParams;

  // Build filter query
  const where: any = {};
  if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
    where.status = status as TicketStatus;
  }
  if (priority && Object.values(Priority).includes(priority as Priority)) {
    where.priority = priority as Priority;
  }
  if (category) {
    where.categoryId = category;
  }
  if (building) {
    where.buildingId = building;
  }
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { ticketNo: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { reporter: { name: { contains: term, mode: "insensitive" } } },
    ];
  }
  if (overdue === "true") {
    where.targetDate = { lt: new Date() };
    where.status = { notIn: [TicketStatus.RESOLVED, ...TERMINAL_STATUSES] };
  }

  // Fetch filter options and tickets
  const [categories, buildings, tickets] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true } }),
    db.building.findMany({ select: { id: true, code: true, name: true } }),
    db.ticket.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: {
        reporter: { select: { name: true, email: true } },
        assignee: { select: { name: true, specialization: true } },
        building: { select: { code: true, name: true } },
        room: { select: { name: true, floor: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  const now = new Date();

  return (
    <AppShell user={session} pageTitle={STRINGS.adminInbox.title}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">
              {STRINGS.adminInbox.title}
            </h1>
            <p className="text-sm text-muted mt-1">
              {STRINGS.adminInbox.subtitle}
            </p>
          </div>

          {session.role === Role.ADMIN && (
            <Link
              href="/tickets/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue hover:bg-blue-hover text-white text-sm font-semibold shadow-sm transition-colors w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{STRINGS.adminInbox.createOnBehalf}</span>
            </Link>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-lg border border-borderline shadow-sm space-y-3">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder={STRINGS.adminInbox.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-borderline focus:border-sky focus:ring-1 focus:ring-sky text-body"
              />
            </div>

            {/* Status Filter */}
            <select
              name="status"
              defaultValue={status || ""}
              className="w-full px-3 py-2 text-xs rounded-md border border-borderline text-body focus:border-sky"
            >
              <option value="">{STRINGS.adminInbox.allStatuses || "All Statuses"}</option>
              {Object.values(TicketStatus).map((st) => (
                <option key={st} value={st}>
                  {STRINGS.status[st] || st}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              name="priority"
              defaultValue={priority || ""}
              className="w-full px-3 py-2 text-xs rounded-md border border-borderline text-body focus:border-sky"
            >
              <option value="">{STRINGS.adminInbox.allPriorities}</option>
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>
                  {STRINGS.priority[p] || p}
                </option>
              ))}
            </select>

            {/* Submit / Reset Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-md bg-blue text-white text-xs font-semibold hover:bg-blue-hover transition-colors shadow-sm"
              >
                Apply
              </button>
              <Link
                href="/inbox"
                className="py-2 px-3 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors text-center"
              >
                Reset
              </Link>
            </div>
          </form>

          {/* Quick Overdue Toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-borderline/80 text-xs">
            <span className="text-muted font-medium">Quick Filters:</span>
            <Link
              href={overdue === "true" ? "/inbox" : "/inbox?overdue=true"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                overdue === "true"
                  ? "bg-semantic-red text-white"
                  : "bg-red-50 text-semantic-red hover:bg-red-100 border border-red-200"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{STRINGS.adminInbox.overdueOnly}</span>
            </Link>
          </div>
        </div>

        {/* Tickets Table */}
        {tickets.length === 0 ? (
          <EmptyState
            title={STRINGS.adminInbox.emptyTitle}
            description={STRINGS.adminInbox.emptySubtitle}
            action={
              <Link
                href="/inbox"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue text-white text-sm font-medium hover:bg-blue-hover shadow-sm"
              >
                {STRINGS.common.reset}
              </Link>
            }
          />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-hidden rounded-lg border border-borderline bg-white shadow-sm">
              <table className="min-w-full divide-y divide-borderline">
                <thead className="bg-canvas">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Ticket No
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Category & Description
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-navy uppercase tracking-wider">
                      Reporter
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-navy uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline bg-white text-xs">
                  {tickets.map((t) => {
                    const overdueItem = isOverdue(t.targetDate, t.status, now);
                    return (
                      <tr key={t.id} className="hover:bg-ice/15 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-blue whitespace-nowrap">
                          {t.ticketNo}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <PriorityChip priority={t.priority} isOverdue={overdueItem} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusChip status={t.status} />
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <span className="font-semibold text-navy block truncate">
                            {t.category.name}
                          </span>
                          <span className="text-muted block truncate">
                            {t.description}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted">
                          <span className="font-medium text-navy block">
                            {t.building.code}
                          </span>
                          <span>{t.room.name}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {t.assignee ? (
                            <div>
                              <span className="font-medium text-navy block">
                                {t.assignee.name}
                              </span>
                              <span className="text-[11px] text-muted">
                                {t.assignee.specialization || "General"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-muted">
                          <span className="font-medium text-navy block">
                            {t.reporter.name}
                          </span>
                          <span className="text-[11px]">
                            {format(new Date(t.createdAt), "MMM d, HH:mm")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`/tickets/${t.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-blue hover:text-navy hover:underline"
                          >
                            <span>Triage</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {tickets.map((t) => {
                const overdueItem = isOverdue(t.targetDate, t.status, now);
                return (
                  <Card key={t.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue text-sm">{t.ticketNo}</span>
                      <StatusChip status={t.status} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <PriorityChip priority={t.priority} isOverdue={overdueItem} />
                        <span className="font-semibold text-navy text-sm">
                          {t.category.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted line-clamp-2">
                        {t.description}
                      </p>
                    </div>

                    <div className="text-xs text-muted pt-2 border-t border-borderline space-y-1">
                      <div>Location: <span className="text-navy font-medium">{t.building.code} - {t.room.name}</span></div>
                      <div>Assignee: <span className="text-navy font-medium">{t.assignee?.name || "Unassigned"}</span></div>
                    </div>

                    <Link
                      href={`/tickets/${t.id}`}
                      className="block text-center py-2 px-3 rounded-md bg-canvas hover:bg-ice/20 text-xs font-semibold text-navy border border-borderline"
                    >
                      View & Triage Ticket
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
