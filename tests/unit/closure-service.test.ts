import { TicketStatus, Role } from "@prisma/client";
import {
  isWithinReopenWindow,
  confirmTicketResolution,
  reopenTicket,
  submitTicketFeedback,
  mergeDuplicateTicket,
  autoCloseResolvedTickets,
} from "@/lib/closure-service";
import { db } from "@/lib/db";

// Mock db
jest.mock("@/lib/db", () => ({
  db: {
    ticket: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    feedback: {
      upsert: jest.fn(),
    },
    ticketStatusHistory: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(db)),
  },
}));

describe("Closure & Post-Resolution Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isWithinReopenWindow", () => {
    const now = new Date("2026-11-24T12:00:00Z");

    it("returns true for tickets resolved 1 day ago (24 hours)", () => {
      const resolvedAt = new Date("2026-11-23T12:00:00Z");
      expect(isWithinReopenWindow(resolvedAt, now)).toBe(true);
    });

    it("returns true for tickets resolved exactly 72 hours ago", () => {
      const resolvedAt = new Date("2026-11-21T12:00:00Z");
      expect(isWithinReopenWindow(resolvedAt, now)).toBe(true);
    });

    it("returns false for tickets resolved more than 72 hours ago", () => {
      const resolvedAt = new Date("2026-11-20T12:00:00Z"); // 96 hours
      expect(isWithinReopenWindow(resolvedAt, now)).toBe(false);
    });

    it("returns false if resolvedAt is null or undefined", () => {
      expect(isWithinReopenWindow(null, now)).toBe(false);
      expect(isWithinReopenWindow(undefined, now)).toBe(false);
    });
  });

  describe("confirmTicketResolution", () => {
    it("transitions RESOLVED ticket to CLOSED and stores rating", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        ticketNo: "CF-202611-0001",
        status: TicketStatus.RESOLVED,
        reporterId: "reporter-1",
        assigneeId: "tech-1",
      });

      (db.ticket.update as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.CLOSED,
      });

      const res = await confirmTicketResolution({
        ticketId: "ticket-1",
        rating: 5,
        comment: "Excellent repair speed!",
        actor: { id: "reporter-1", name: "Siti", role: Role.REPORTER },
      });

      expect(res.status).toBe(TicketStatus.CLOSED);
      expect(db.ticketStatusHistory.create).toHaveBeenCalled();
      expect(db.feedback.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ticketId: "ticket-1" },
          create: expect.objectContaining({ rating: 5, comment: "Excellent repair speed!" }),
        })
      );
    });

    it("throws error if ticket is not in RESOLVED status", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.IN_PROGRESS,
        reporterId: "reporter-1",
      });

      await expect(
        confirmTicketResolution({
          ticketId: "ticket-1",
          actor: { id: "reporter-1", name: "Siti", role: Role.REPORTER },
        })
      ).rejects.toThrow(/must be in resolved status/i);
    });
  });

  describe("reopenTicket", () => {
    it("throws error if reason is missing", async () => {
      await expect(
        reopenTicket({
          ticketId: "ticket-1",
          reason: "",
          actor: { id: "reporter-1", name: "Siti", role: Role.REPORTER },
        })
      ).rejects.toThrow(/reason is required/i);
    });

    it("throws error if 3-day reopen window has expired", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        reporterId: "reporter-1",
      });

      await expect(
        reopenTicket({
          ticketId: "ticket-1",
          reason: "Light stopped working again",
          actor: { id: "reporter-1", name: "Siti", role: Role.REPORTER },
        })
      ).rejects.toThrow(/reopen window has expired/i);
    });

    it("successfully reopens ticket when within 3-day window", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        ticketNo: "CF-202611-0001",
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        reporterId: "reporter-1",
      });

      (db.ticket.update as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.REOPENED,
      });

      (db.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-1" },
      ]);

      const res = await reopenTicket({
        ticketId: "ticket-1",
        reason: "Flickering resumed after 2 hours",
        actor: { id: "reporter-1", name: "Siti", role: Role.REPORTER },
      });

      expect(res.status).toBe(TicketStatus.REOPENED);
      expect(db.ticketStatusHistory.create).toHaveBeenCalled();
    });
  });

  describe("mergeDuplicateTicket", () => {
    it("merges secondary SUBMITTED ticket into primary ticket", async () => {
      (db.ticket.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: "ticket-secondary",
          ticketNo: "CF-202611-0002",
          status: TicketStatus.SUBMITTED,
          reporterId: "user-2",
        })
        .mockResolvedValueOnce({
          id: "ticket-primary",
          ticketNo: "CF-202611-0001",
          status: TicketStatus.ASSIGNED,
        });

      (db.ticket.update as jest.Mock).mockResolvedValue({
        id: "ticket-secondary",
        status: TicketStatus.MERGED,
        parentTicketId: "ticket-primary",
      });

      const res = await mergeDuplicateTicket({
        ticketId: "ticket-secondary",
        primaryTicketId: "ticket-primary",
        reason: "Duplicate report",
        actor: { id: "admin-1", name: "Budi", role: Role.ADMIN },
      });

      expect(res.status).toBe(TicketStatus.MERGED);
      expect(db.ticketStatusHistory.create).toHaveBeenCalled();
      expect(db.notification.create).toHaveBeenCalled();
    });

    it("disallows non-admin from merging tickets", async () => {
      await expect(
        mergeDuplicateTicket({
          ticketId: "ticket-2",
          primaryTicketId: "ticket-1",
          actor: { id: "user-1", name: "User", role: Role.REPORTER },
        })
      ).rejects.toThrow(/only administrators/i);
    });
  });

  describe("autoCloseResolvedTickets", () => {
    it("auto-closes eligible tickets resolved more than 3 days ago", async () => {
      (db.ticket.findMany as jest.Mock).mockResolvedValue([
        { id: "ticket-10", ticketNo: "CF-202611-0010", reporterId: "reporter-1" },
        { id: "ticket-11", ticketNo: "CF-202611-0011", reporterId: "reporter-2" },
      ]);

      (db.ticket.update as jest.Mock).mockResolvedValue({});

      const result = await autoCloseResolvedTickets("system-admin-id");

      expect(result.closedCount).toBe(2);
      expect(result.closedTicketIds).toEqual(["ticket-10", "ticket-11"]);
      expect(db.ticketStatusHistory.create).toHaveBeenCalledTimes(2);
    });
  });
});
