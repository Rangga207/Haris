import { Priority, Role, TicketStatus } from "@prisma/client";
import {
  updateTicketPriority,
  assignTechnician,
  transitionTicketStatus,
} from "@/lib/ticket-service";
import { db } from "@/lib/db";

// Mock db
jest.mock("@/lib/db", () => ({
  db: {
    ticket: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    ticketAssignment: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    ticketStatusHistory: {
      create: jest.fn(),
    },
    ticketAttachment: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(db)),
  },
}));

describe("Ticket Service Workflow & Rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateTicketPriority", () => {
    it("throws error if non-admin attempts to update priority", async () => {
      await expect(
        updateTicketPriority({
          ticketId: "ticket-1",
          newPriority: Priority.HIGH,
          actor: { id: "tech-1", name: "Technician", role: Role.TECHNICIAN },
        })
      ).rejects.toThrow("Only administrators can update ticket priority.");
    });

    it("requires justification reason when departing from suggested priority", async () => {
      // Mock category Electrical -> default priority is MEDIUM
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        priority: Priority.MEDIUM,
        isSafetyHazard: false,
        category: { name: "Electrical" },
        reporter: { id: "user-1" },
      });

      await expect(
        updateTicketPriority({
          ticketId: "ticket-1",
          newPriority: Priority.CRITICAL, // departing from suggested MEDIUM
          reason: "", // missing reason
          actor: { id: "admin-1", name: "Admin", role: Role.ADMIN },
        })
      ).rejects.toThrow(/justification reason is required/i);
    });

    it("successfully updates priority when valid reason is supplied", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        ticketNo: "CF-202611-0001",
        priority: Priority.MEDIUM,
        isSafetyHazard: false,
        category: { name: "Electrical" },
        reporterId: "user-1",
      });
      (db.ticket.update as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        priority: Priority.HIGH,
      });

      const updated = await updateTicketPriority({
        ticketId: "ticket-1",
        newPriority: Priority.HIGH,
        reason: "VIP laboratory room with sensitive research",
        actor: { id: "admin-1", name: "Admin", role: Role.ADMIN },
      });

      expect(updated.priority).toBe(Priority.HIGH);
      expect(db.ticketStatusHistory.create).toHaveBeenCalled();
    });
  });

  describe("assignTechnician", () => {
    it("throws error if selected user is not an active technician", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        reporterId: "user-1",
      });
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-2",
        role: Role.REPORTER, // Not a technician
        isActive: true,
      });

      await expect(
        assignTechnician({
          ticketId: "ticket-1",
          technicianId: "user-2",
          targetDate: new Date(),
          actor: { id: "admin-1", name: "Admin", role: Role.ADMIN },
        })
      ).rejects.toThrow(/not an active technician/i);
    });

    it("successfully assigns technician and logs reassignment if previous assignee exists", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        ticketNo: "CF-202611-0001",
        status: TicketStatus.TRIAGED,
        reporterId: "user-1",
        assigneeId: "old-tech-id",
        assignee: { name: "Old Tech" },
      });

      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: "new-tech-id",
        name: "New Tech",
        role: Role.TECHNICIAN,
        isActive: true,
      });

      (db.ticket.update as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.ASSIGNED,
        assigneeId: "new-tech-id",
      });

      const targetDate = new Date("2026-11-26");
      const res = await assignTechnician({
        ticketId: "ticket-1",
        technicianId: "new-tech-id",
        targetDate,
        actor: { id: "admin-1", name: "Admin", role: Role.ADMIN },
      });

      expect(res.status).toBe(TicketStatus.ASSIGNED);
      expect(db.ticketAssignment.updateMany).toHaveBeenCalled();
      expect(db.ticketAssignment.create).toHaveBeenCalled();
      expect(db.ticketStatusHistory.create).toHaveBeenCalled();
    });
  });

  describe("transitionTicketStatus", () => {
    it("disallows non-assignee technician from starting someone else's ticket", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.ASSIGNED,
        assigneeId: "assigned-tech-id",
      });

      await expect(
        transitionTicketStatus({
          ticketId: "ticket-1",
          toStatus: TicketStatus.IN_PROGRESS,
          actor: { id: "intruder-tech-id", name: "Other Tech", role: Role.TECHNICIAN },
        })
      ).rejects.toThrow(/only update tickets assigned directly to you/i);
    });

    it("requires completion notes when technician marks job as RESOLVED", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.IN_PROGRESS,
        assigneeId: "assigned-tech-id",
        reporterId: "user-1",
      });

      await expect(
        transitionTicketStatus({
          ticketId: "ticket-1",
          toStatus: TicketStatus.RESOLVED,
          note: "", // missing notes
          actor: { id: "assigned-tech-id", name: "Tech", role: Role.TECHNICIAN },
        })
      ).rejects.toThrow(/completion notes are required/i);
    });

    it("requires reason when placing ticket ON_HOLD", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.IN_PROGRESS,
        assigneeId: "assigned-tech-id",
      });

      await expect(
        transitionTicketStatus({
          ticketId: "ticket-1",
          toStatus: TicketStatus.ON_HOLD,
          reason: "", // missing reason
          actor: { id: "assigned-tech-id", name: "Tech", role: Role.TECHNICIAN },
        })
      ).rejects.toThrow(/reason is required/i);
    });

    it("successfully marks ticket RESOLVED with notes and sets resolvedAt", async () => {
      (db.ticket.findUnique as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        ticketNo: "CF-202611-0001",
        status: TicketStatus.IN_PROGRESS,
        assigneeId: "tech-1",
        reporterId: "user-1",
      });

      (db.ticket.update as jest.Mock).mockResolvedValue({
        id: "ticket-1",
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      const res = await transitionTicketStatus({
        ticketId: "ticket-1",
        toStatus: TicketStatus.RESOLVED,
        note: "Replaced faulty switch and verified wiring.",
        actor: { id: "tech-1", name: "Agus Pratama", role: Role.TECHNICIAN },
      });

      expect(res.status).toBe(TicketStatus.RESOLVED);
      expect(db.ticketStatusHistory.create).toHaveBeenCalled();
    });
  });
});
