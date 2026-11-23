import * as React from "react";
import { TicketStatus } from "@prisma/client";
import { cn } from "./button";
import { STRINGS } from "@/lib/constants/strings";

interface StatusChipProps {
  status: TicketStatus;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const getStyles = (st: TicketStatus) => {
    switch (st) {
      case TicketStatus.SUBMITTED:
        // Ice tint with navy text
        return "bg-ice/40 text-navy border-ice";
      case TicketStatus.NEEDS_INFO:
      case TicketStatus.ON_HOLD:
        // Amber tint
        return "bg-amber-50 text-amber-900 border-amber-200";
      case TicketStatus.TRIAGED:
      case TicketStatus.ASSIGNED:
        // Sky soft tint with navy text
        return "bg-sky/20 text-navy border-sky/40";
      case TicketStatus.IN_PROGRESS:
        // Blue soft tint with navy text
        return "bg-blue/10 text-blue border-blue/30 font-semibold";
      case TicketStatus.RESOLVED:
      case TicketStatus.CLOSED:
        // Green soft tint
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case TicketStatus.REJECTED:
        // Red soft tint
        return "bg-red-50 text-red-800 border-red-200";
      case TicketStatus.REOPENED:
        // Red/Orange tint
        return "bg-orange-50 text-orange-900 border-orange-200";
      case TicketStatus.MERGED:
      case TicketStatus.CANCELLED:
      default:
        // Slate soft tint
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const label = STRINGS.status[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getStyles(status),
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {label}
    </span>
  );
}
