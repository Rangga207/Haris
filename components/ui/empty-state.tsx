import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-borderline rounded-lg bg-white/50",
        className
      )}
    >
      <div className="p-3 bg-ice/30 rounded-full text-navy mb-3">
        {icon || <Inbox className="w-8 h-8 text-navy" />}
      </div>
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="text-sm text-muted max-w-sm mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
