import { TicketStatus } from "@prisma/client";
import { isOverdue } from "@/lib/overdue";

describe("Overdue Calculation Logic", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const pastDate = new Date("2026-11-20T12:00:00Z");
  const futureDate = new Date("2026-11-25T12:00:00Z");

  it("returns true when targetDate is in the past and ticket is active", () => {
    expect(isOverdue(pastDate, TicketStatus.SUBMITTED, now)).toBe(true);
    expect(isOverdue(pastDate, TicketStatus.ASSIGNED, now)).toBe(true);
    expect(isOverdue(pastDate, TicketStatus.IN_PROGRESS, now)).toBe(true);
    expect(isOverdue(pastDate, TicketStatus.ON_HOLD, now)).toBe(true);
  });

  it("returns false when targetDate is in the future", () => {
    expect(isOverdue(futureDate, TicketStatus.ASSIGNED, now)).toBe(false);
    expect(isOverdue(futureDate, TicketStatus.IN_PROGRESS, now)).toBe(false);
  });

  it("returns false if targetDate is not set", () => {
    expect(isOverdue(null, TicketStatus.ASSIGNED, now)).toBe(false);
    expect(isOverdue(undefined, TicketStatus.IN_PROGRESS, now)).toBe(false);
  });

  it("returns false if ticket is RESOLVED or terminal, even if past targetDate", () => {
    expect(isOverdue(pastDate, TicketStatus.RESOLVED, now)).toBe(false);
    expect(isOverdue(pastDate, TicketStatus.CLOSED, now)).toBe(false);
    expect(isOverdue(pastDate, TicketStatus.REJECTED, now)).toBe(false);
    expect(isOverdue(pastDate, TicketStatus.MERGED, now)).toBe(false);
    expect(isOverdue(pastDate, TicketStatus.CANCELLED, now)).toBe(false);
  });
});
