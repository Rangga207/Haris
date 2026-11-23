import { TicketStatus } from "@prisma/client";
import { isTerminalStatus } from "./ticket-state";

/**
 * An issue is overdue if targetDate is in the past AND status is not terminal or resolved.
 */
export function isOverdue(
  targetDate: Date | string | null | undefined,
  status: TicketStatus,
  now: Date = new Date()
): boolean {
  if (!targetDate) return false;
  if (status === TicketStatus.RESOLVED || isTerminalStatus(status)) {
    return false;
  }
  const target = new Date(targetDate);
  return target.getTime() < now.getTime();
}
