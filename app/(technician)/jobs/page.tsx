import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role, TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StatusChip } from "@/components/ui/status-chip";
import { PriorityChip } from "@/components/ui/priority-chip";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { isOverdue } from "@/lib/overdue";
import { format } from "date-fns";
import { Wrench, Calendar, ArrowRight, Filter } from "lucide-react";

export default async function TechnicianJobsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== Role.TECHNICIAN) {
    redirect("/login");
  }

  const statusFilter = searchParams.status as TicketStatus | undefined;

  const where: any = {
    assigneeId: session.userId,
  };
  if (statusFilter && Object.values(TicketStatus).includes(statusFilter)) {
    where.status = statusFilter;
  }

  // Sorted by priority then due date (earliest due date first)
  const jobs = await db.ticket.findMany({
    where,
    orderBy: [
      { priority: "asc" },
      { targetDate: "asc" },
    ],
    include: {
      category: { select: { name: true } },
      building: { select: { code: true, name: true } },
      room: { select: { name: true, floor: true } },
      reporter: { select: { name: true, phone: true } },
    },
  });

  const now = new Date();

  return (
    <AppShell user={session} pageTitle="My Assigned Jobs">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue" />
            My Assigned Jobs
          </h1>
          <p className="text-sm text-muted mt-1">
            Work queue sorted by priority and deadline. Click any job to update work status.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-borderline shadow-sm overflow-x-auto text-xs">
          <div className="flex items-center gap-2 font-semibold text-navy pl-1">
            <Filter className="w-3.5 h-3.5 text-blue" />
            <span>Filter Status:</span>
          </div>

          <Link
            href="/jobs"
            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
              !statusFilter
                ? "bg-blue text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Jobs ({jobs.length})
          </Link>

          {[
            TicketStatus.ASSIGNED,
            TicketStatus.IN_PROGRESS,
            TicketStatus.ON_HOLD,
            TicketStatus.RESOLVED,
          ].map((st) => (
            <Link
              key={st}
              href={`/jobs?status=${st}`}
              className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-blue text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {st}
            </Link>
          ))}
        </div>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs assigned"
            description="You currently have no jobs matching the selected status filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const overdue = isOverdue(job.targetDate, job.status, now);
              return (
                <Card
                  key={job.id}
                  className="p-5 flex flex-col justify-between border-borderline hover:border-sky transition-all shadow-sm group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-blue text-sm">
                        {job.ticketNo}
                      </span>
                      <StatusChip status={job.status} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <PriorityChip priority={job.priority} isOverdue={overdue} />
                        <span className="font-bold text-navy text-sm">
                          {job.category.name}
                        </span>
                      </div>
                      <p className="text-xs text-body line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-borderline text-xs text-muted space-y-1">
                      <div>
                        Location: <span className="font-semibold text-navy">{job.building.code} — {job.room.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue" />
                        <span>Due: </span>
                        <span className={overdue ? "font-bold text-semantic-red" : "font-semibold text-navy"}>
                          {job.targetDate ? format(new Date(job.targetDate), "MMM d, yyyy") : "No date set"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-borderline">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-canvas hover:bg-ice/20 text-xs font-bold text-navy border border-borderline group-hover:border-sky transition-colors"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
