import { Role, TicketStatus } from "@prisma/client";

export const TERMINAL_STATUSES: TicketStatus[] = [
  TicketStatus.CLOSED,
  TicketStatus.REJECTED,
  TicketStatus.MERGED,
  TicketStatus.CANCELLED,
];

export interface StatusTransitionRule {
  from: TicketStatus;
  to: TicketStatus;
  allowedRoles: Role[];
  description: string;
  requiresReason?: boolean;
  requiresTechnician?: boolean;
  requiresTargetDate?: boolean;
  requiresNotes?: boolean;
}

export const VALID_TRANSITIONS: StatusTransitionRule[] = [
  // SUBMITTED -> TRIAGED (admin, priority confirmed)
  {
    from: TicketStatus.SUBMITTED,
    to: TicketStatus.TRIAGED,
    allowedRoles: [Role.ADMIN],
    description: "Admin triages ticket and confirms priority",
  },
  // SUBMITTED -> NEEDS_INFO (admin, question required)
  {
    from: TicketStatus.SUBMITTED,
    to: TicketStatus.NEEDS_INFO,
    allowedRoles: [Role.ADMIN],
    description: "Admin requests additional information",
    requiresReason: true,
  },
  // NEEDS_INFO -> SUBMITTED (reporter replied)
  {
    from: TicketStatus.NEEDS_INFO,
    to: TicketStatus.SUBMITTED,
    allowedRoles: [Role.REPORTER, Role.ADMIN],
    description: "Reporter provides requested information",
    requiresNotes: true,
  },
  // SUBMITTED -> REJECTED (admin, reason required)
  {
    from: TicketStatus.SUBMITTED,
    to: TicketStatus.REJECTED,
    allowedRoles: [Role.ADMIN],
    description: "Admin rejects complaint",
    requiresReason: true,
  },
  // SUBMITTED -> MERGED (admin, link to primary ticket)
  {
    from: TicketStatus.SUBMITTED,
    to: TicketStatus.MERGED,
    allowedRoles: [Role.ADMIN],
    description: "Admin marks ticket as duplicate and merges",
    requiresReason: true,
  },
  // SUBMITTED -> CANCELLED (reporter, only before triage)
  {
    from: TicketStatus.SUBMITTED,
    to: TicketStatus.CANCELLED,
    allowedRoles: [Role.REPORTER],
    description: "Reporter cancels ticket before triage",
  },
  // TRIAGED -> ASSIGNED (admin, technician AND targetDate required)
  {
    from: TicketStatus.TRIAGED,
    to: TicketStatus.ASSIGNED,
    allowedRoles: [Role.ADMIN],
    description: "Admin assigns technician and target completion date",
    requiresTechnician: true,
    requiresTargetDate: true,
  },
  // ASSIGNED -> IN_PROGRESS (technician, must be assignee)
  {
    from: TicketStatus.ASSIGNED,
    to: TicketStatus.IN_PROGRESS,
    allowedRoles: [Role.TECHNICIAN],
    description: "Technician starts work on ticket",
  },
  // IN_PROGRESS -> ON_HOLD (technician, reason required)
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.ON_HOLD,
    allowedRoles: [Role.TECHNICIAN],
    description: "Technician places work on hold",
    requiresReason: true,
  },
  // ON_HOLD -> IN_PROGRESS (technician)
  {
    from: TicketStatus.ON_HOLD,
    to: TicketStatus.IN_PROGRESS,
    allowedRoles: [Role.TECHNICIAN],
    description: "Technician resumes work",
  },
  // IN_PROGRESS -> RESOLVED (technician, completion notes required)
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.RESOLVED,
    allowedRoles: [Role.TECHNICIAN],
    description: "Technician marks ticket resolved",
    requiresNotes: true,
  },
  // ASSIGNED or IN_PROGRESS -> ASSIGNED (admin, reassignment)
  {
    from: TicketStatus.ASSIGNED,
    to: TicketStatus.ASSIGNED,
    allowedRoles: [Role.ADMIN],
    description: "Admin reassigns technician",
    requiresTechnician: true,
  },
  {
    from: TicketStatus.IN_PROGRESS,
    to: TicketStatus.ASSIGNED,
    allowedRoles: [Role.ADMIN],
    description: "Admin reassigns technician from in-progress",
    requiresTechnician: true,
  },
  // RESOLVED -> CLOSED (reporter confirms, or system auto-close)
  {
    from: TicketStatus.RESOLVED,
    to: TicketStatus.CLOSED,
    allowedRoles: [Role.REPORTER, Role.ADMIN],
    description: "Reporter or admin confirms resolution and closes ticket",
  },
  // RESOLVED -> REOPENED (reporter, within 3 days, reason required)
  {
    from: TicketStatus.RESOLVED,
    to: TicketStatus.REOPENED,
    allowedRoles: [Role.REPORTER],
    description: "Reporter reopens ticket within 3-day window",
    requiresReason: true,
  },
  // REOPENED -> ASSIGNED (admin)
  {
    from: TicketStatus.REOPENED,
    to: TicketStatus.ASSIGNED,
    allowedRoles: [Role.ADMIN],
    description: "Admin reassigns technician for reopened ticket",
    requiresTechnician: true,
  },
];

export function isTerminalStatus(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(
  from: TicketStatus,
  to: TicketStatus,
  role: Role
): { allowed: boolean; reason?: string; rule?: StatusTransitionRule } {
  if (isTerminalStatus(from)) {
    return {
      allowed: false,
      reason: `Ticket is in terminal status '${from}' and cannot transition.`,
    };
  }

  const rule = VALID_TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!rule) {
    return {
      allowed: false,
      reason: `Transition from '${from}' to '${to}' is not permitted.`,
    };
  }

  if (!rule.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to transition from '${from}' to '${to}'.`,
    };
  }

  return { allowed: true, rule };
}
