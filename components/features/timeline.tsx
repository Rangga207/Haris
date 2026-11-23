import React from "react";
import { format } from "date-fns";
import { StatusChip } from "../ui/status-chip";
import { TicketStatus, Role } from "@prisma/client";
import { Clock, User } from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";

export interface StatusHistoryItem {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  note: string | null;
  createdAt: string | Date;
  changedBy: {
    id: string;
    name: string;
    role: Role;
  };
}

export function Timeline({ history }: { history: StatusHistoryItem[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-xs text-muted py-4 italic">
        No status history recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-borderline">
      {history.map((item, index) => {
        const isLatest = index === history.length - 1;

        return (
          <div key={item.id} className="relative group">
            {/* Dot on timeline */}
            <div
              className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform ${
                isLatest
                  ? "bg-blue ring-4 ring-sky/30"
                  : "bg-slate-300 group-hover:bg-sky"
              }`}
            />

            <div className="bg-canvas/50 hover:bg-ice/15 border border-borderline/80 rounded-lg p-3 text-xs transition-colors space-y-1.5">
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy">
                    {item.changedBy.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                    {STRINGS.roles[item.changedBy.role] || item.changedBy.role}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}</span>
                </div>
              </div>

              {/* Status Change Indicator */}
              <div className="flex items-center gap-2 pt-0.5">
                {item.fromStatus && (
                  <>
                    <StatusChip status={item.fromStatus} />
                    <span className="text-muted">→</span>
                  </>
                )}
                <StatusChip status={item.toStatus} />
              </div>

              {/* Note / Reason if present */}
              {item.note && (
                <p className="text-body text-xs pt-1 border-t border-borderline/60 whitespace-pre-wrap leading-relaxed">
                  {item.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
