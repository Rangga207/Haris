import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus, Priority } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardCharts } from "@/components/features/dashboard-charts";
import { UnresolvedTicketsTable } from "@/components/features/unresolved-tickets-table";
import { TERMINAL_STATUSES } from "@/lib/ticket-state";
import { isOverdue } from "@/lib/overdue";
import {
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Star,
  Layers,
  Sparkles,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== Role.UNIT_HEAD && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const now = new Date();
  const nonActive = [TicketStatus.RESOLVED, ...TERMINAL_STATUSES];

  // 1. Fetch KPI metrics and aggregations
  const [
    totalCount,
    openCount,
    overdueCount,
    criticalCount,
    feedbackAgg,
    statusGroups,
    priorityGroups,
    buildings,
    unresolvedTickets,
  ] = await Promise.all([
    db.ticket.count(),
    db.ticket.count({ where: { status: { notIn: nonActive } } }),
    db.ticket.count({
      where: {
        targetDate: { lt: now },
        status: { notIn: nonActive },
      },
    }),
    db.ticket.count({
      where: {
        priority: Priority.CRITICAL,
        status: { notIn: nonActive },
      },
    }),
    db.feedback.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    db.ticket.groupBy({ by: ["priority"], _count: { _all: true } }),
    db.building.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { code: "asc" },
    }),
    db.ticket.findMany({
      where: { status: { notIn: nonActive } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 20,
      include: {
        reporter: { select: { name: true } },
        assignee: { select: { name: true, specialization: true } },
        building: { select: { code: true } },
        room: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of statusGroups) statusMap[s.status] = s._count._all;

  const priorityMap: Record<string, number> = {};
  for (const p of priorityGroups) priorityMap[p.priority] = p._count._all;

  const buildingDistribution = buildings.map((b) => ({
    name: b.code,
    fullName: b.name,
    count: b._count.tickets,
  }));

  const enrichedUnresolved = unresolvedTickets.map((t) => {
    const ageHours = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    return {
      ...t,
      ageDays,
      ageHours,
      isOverdue: isOverdue(t.targetDate, t.status, now),
    };
  });

  return (
    <AppShell user={session} pageTitle="Executive Facilities Dashboard">
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">
              Facilities Management Dashboard
            </h1>
            <p className="text-sm text-muted mt-1">
              Real-time operational health, SLA compliance, and dispatch queues.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/reports/export"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 text-navy border border-borderline text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-blue" />
              <span>Export CSV Report</span>
            </a>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Open Complaints */}
          <Card className="p-4 border-borderline">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Active Open Tickets
              </span>
              <Layers className="w-5 h-5 text-blue" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy">{openCount}</span>
              <span className="text-xs text-muted">of {totalCount} total</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              Currently pending triage or in repair
            </p>
          </Card>

          {/* 2. Overdue Complaints */}
          <Card className="p-4 border-borderline">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Overdue Complaints
              </span>
              <Clock className="w-5 h-5 text-semantic-red" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-semantic-red">{overdueCount}</span>
              {overdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 animate-pulse">
                  Requires Attention
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted mt-1">
              Passed estimated target completion date
            </p>
          </Card>

          {/* 3. Critical Safety Hazards */}
          <Card className="p-4 border-borderline">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Critical Hazards
              </span>
              <AlertTriangle className="w-5 h-5 text-semantic-orange" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy">{criticalCount}</span>
              <span className="text-xs text-muted">high priority</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              30-minute first response SLA target
            </p>
          </Card>

          {/* 4. Service Rating */}
          <Card className="p-4 border-borderline">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                User Satisfaction
              </span>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy">
                {feedbackAgg._avg.rating ? feedbackAgg._avg.rating.toFixed(1) : "5.0"}
              </span>
              <span className="text-xs text-muted">
                ({feedbackAgg._count._all} reviews)
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              Verified reporter feedback rating
            </p>
          </Card>
        </div>

        {/* Visual Charts */}
        <DashboardCharts
          statusDistribution={statusMap}
          priorityDistribution={priorityMap}
          buildingDistribution={buildingDistribution}
        />

        {/* Unresolved Tickets Table */}
        <UnresolvedTicketsTable tickets={enrichedUnresolved as any} />
      </div>
    </AppShell>
  );
}
