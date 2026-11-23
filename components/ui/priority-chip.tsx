import * as React from "react";
import { Priority } from "@prisma/client";
import { cn } from "./button";
import { STRINGS } from "@/lib/constants/strings";

interface PriorityChipProps {
  priority: Priority;
  isOverdue?: boolean;
  className?: string;
}

export function PriorityChip({ priority, isOverdue = false, className }: PriorityChipProps) {
  const getStyles = (p: Priority) => {
    switch (p) {
      case Priority.CRITICAL:
        return "bg-red-50 text-red-800 border-red-300";
      case Priority.HIGH:
        return "bg-orange-50 text-orange-900 border-orange-300";
      case Priority.MEDIUM:
        return "bg-amber-50 text-amber-900 border-amber-300";
      case Priority.LOW:
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const label = STRINGS.priority[priority] || priority;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border",
          getStyles(priority),
          className
        )}
      >
        {label}
      </span>
      {isOverdue && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-semantic-red text-white animate-pulse shadow-sm">
          {STRINGS.priority.overdue}
        </span>
      )}
    </div>
  );
}
