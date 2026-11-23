import { TicketStatus, Role } from "@prisma/client";
import { canTransition, isTerminalStatus, VALID_TRANSITIONS, TERMINAL_STATUSES } from "@/lib/ticket-state";

describe("Ticket State Transitions", () => {
  describe("Terminal Statuses", () => {
    it("should correctly identify all terminal statuses", () => {
      expect(isTerminalStatus(TicketStatus.CLOSED)).toBe(true);
      expect(isTerminalStatus(TicketStatus.REJECTED)).toBe(true);
      expect(isTerminalStatus(TicketStatus.MERGED)).toBe(true);
      expect(isTerminalStatus(TicketStatus.CANCELLED)).toBe(true);

      expect(isTerminalStatus(TicketStatus.SUBMITTED)).toBe(false);
      expect(isTerminalStatus(TicketStatus.IN_PROGRESS)).toBe(false);
      expect(isTerminalStatus(TicketStatus.ON_HOLD)).toBe(false);
      expect(isTerminalStatus(TicketStatus.RESOLVED)).toBe(false);
    });

    it("should forbid any transition out of a terminal status", () => {
      for (const terminal of TERMINAL_STATUSES) {
        const result = canTransition(terminal, TicketStatus.IN_PROGRESS, Role.ADMIN);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("terminal status");
      }
    });
  });

  describe("Valid Status Transitions & Roles", () => {
    it("allows ADMIN to triage SUBMITTED ticket", () => {
      const res = canTransition(TicketStatus.SUBMITTED, TicketStatus.TRIAGED, Role.ADMIN);
      expect(res.allowed).toBe(true);
    });

    it("prevents REPORTER or TECHNICIAN from triaging ticket", () => {
      expect(canTransition(TicketStatus.SUBMITTED, TicketStatus.TRIAGED, Role.REPORTER).allowed).toBe(false);
      expect(canTransition(TicketStatus.SUBMITTED, TicketStatus.TRIAGED, Role.TECHNICIAN).allowed).toBe(false);
    });

    it("allows ADMIN to request info on SUBMITTED ticket", () => {
      const res = canTransition(TicketStatus.SUBMITTED, TicketStatus.NEEDS_INFO, Role.ADMIN);
      expect(res.allowed).toBe(true);
      expect(res.rule?.requiresReason).toBe(true);
    });

    it("allows REPORTER to reply to NEEDS_INFO and move back to SUBMITTED", () => {
      const res = canTransition(TicketStatus.NEEDS_INFO, TicketStatus.SUBMITTED, Role.REPORTER);
      expect(res.allowed).toBe(true);
    });

    it("allows REPORTER to cancel SUBMITTED ticket before triage", () => {
      const res = canTransition(TicketStatus.SUBMITTED, TicketStatus.CANCELLED, Role.REPORTER);
      expect(res.allowed).toBe(true);
    });

    it("prevents REPORTER from cancelling TRIAGED or ASSIGNED ticket", () => {
      expect(canTransition(TicketStatus.TRIAGED, TicketStatus.CANCELLED, Role.REPORTER).allowed).toBe(false);
      expect(canTransition(TicketStatus.ASSIGNED, TicketStatus.CANCELLED, Role.REPORTER).allowed).toBe(false);
    });

    it("allows ADMIN to assign technician from TRIAGED status", () => {
      const res = canTransition(TicketStatus.TRIAGED, TicketStatus.ASSIGNED, Role.ADMIN);
      expect(res.allowed).toBe(true);
      expect(res.rule?.requiresTechnician).toBe(true);
      expect(res.rule?.requiresTargetDate).toBe(true);
    });

    it("allows TECHNICIAN to start ASSIGNED ticket to IN_PROGRESS", () => {
      const res = canTransition(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, Role.TECHNICIAN);
      expect(res.allowed).toBe(true);
    });

    it("allows TECHNICIAN to put IN_PROGRESS ticket ON_HOLD with reason", () => {
      const res = canTransition(TicketStatus.IN_PROGRESS, TicketStatus.ON_HOLD, Role.TECHNICIAN);
      expect(res.allowed).toBe(true);
      expect(res.rule?.requiresReason).toBe(true);
    });

    it("allows TECHNICIAN to resume ON_HOLD ticket back to IN_PROGRESS", () => {
      const res = canTransition(TicketStatus.ON_HOLD, TicketStatus.IN_PROGRESS, Role.TECHNICIAN);
      expect(res.allowed).toBe(true);
    });

    it("allows TECHNICIAN to mark IN_PROGRESS ticket as RESOLVED", () => {
      const res = canTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, Role.TECHNICIAN);
      expect(res.allowed).toBe(true);
      expect(res.rule?.requiresNotes).toBe(true);
    });

    it("allows REPORTER to confirm RESOLVED ticket to CLOSED", () => {
      const res = canTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED, Role.REPORTER);
      expect(res.allowed).toBe(true);
    });

    it("allows REPORTER to reopen RESOLVED ticket", () => {
      const res = canTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED, Role.REPORTER);
      expect(res.allowed).toBe(true);
      expect(res.rule?.requiresReason).toBe(true);
    });

    it("allows ADMIN to reassign REOPENED ticket", () => {
      const res = canTransition(TicketStatus.REOPENED, TicketStatus.ASSIGNED, Role.ADMIN);
      expect(res.allowed).toBe(true);
    });
  });

  describe("Invalid Arbitrary Transitions", () => {
    it("disallows skipping from SUBMITTED directly to RESOLVED", () => {
      const res = canTransition(TicketStatus.SUBMITTED, TicketStatus.RESOLVED, Role.TECHNICIAN);
      expect(res.allowed).toBe(false);
    });

    it("disallows transitioning from ASSIGNED directly to CLOSED", () => {
      const res = canTransition(TicketStatus.ASSIGNED, TicketStatus.CLOSED, Role.ADMIN);
      expect(res.allowed).toBe(false);
    });
  });
});
