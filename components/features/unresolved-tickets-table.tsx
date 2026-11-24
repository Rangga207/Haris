import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Priority, TicketStatus } from "@prisma/client";
import { PriorityChip } from "../ui/priority-chip";
import { StatusChip } from "../ui/status-chip";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Clock, ExternalLink, AlertCircle } from "lucide-react";

interface UnresolvedTicket {
  id: string;
  ticketNo: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  createdAt: string | Date;
  targetDate?: string | Date | null;
  isOverdue?: boolean;
  ageDays: number;
  ageHours: number;
  reporter: { name: string };
  assignee?: { name: string; specialization?: string | null } | null;
  building: { code: string };
  room: { name: string };
  category: { name: string };
}

export function UnresolvedTicketsTable({
  tickets,
}: {
  tickets: UnresolvedTicket[];
}) {
  return (
    <Card className="border-borderline shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-borderline">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue" />
          <CardTitle className="text-sm font-bold text-navy">
            Unresolved & Overdue Tickets ({tickets.length})
          </CardTitle>
        </div>
        <span className="text-xs text-muted">Sorted by Age (Oldest First)</span>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-borderline text-xs">
            <thead className="bg-canvas">
              <tr className="text-left font-semibold text-navy">
                <th className="p-3.5">Ticket ID</th>
                <th className="p-3.5">Age</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Category & Area</th>
                <th className="p-3.5">Assignee</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderline bg-white">
              {tickets.slice(0, 15).map((t) => (
                <tr key={t.id} className="hover:bg-ice/15 transition-colors">
                  <td className="p-3.5 font-bold text-blue whitespace-nowrap">
                    {t.ticketNo}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${
                        t.ageDays >= 3
                          ? "bg-red-50 text-semantic-red"
                          : t.ageDays >= 1
                          ? "bg-amber-50 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.ageDays > 0 ? `${t.ageDays}d old` : `${t.ageHours}h old`}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <PriorityChip priority={t.priority} isOverdue={t.isOverdue} />
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <StatusChip status={t.status} />
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-navy block">
                      {t.category.name}
                    </span>
                    <span className="text-muted text-[11px]">
                      {t.building.code} — {t.room.name}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {t.assignee ? (
                      <div>
                        <span className="font-semibold text-navy block">
                          {t.assignee.name}
                        </span>
                        <span className="text-[11px] text-muted capitalize">
                          {t.assignee.specialization || "General"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-blue hover:text-navy hover:underline"
                    >
                      <span>Triage</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
