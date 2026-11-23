import { Role } from "@prisma/client";

export const ROLE_HOME_PAGES: Record<Role, string> = {
  REPORTER: "/requests",
  ADMIN: "/inbox",
  TECHNICIAN: "/jobs",
  UNIT_HEAD: "/dashboard",
};

export function getDefaultRedirectForRole(role: Role): string {
  return ROLE_HOME_PAGES[role] || "/login";
}

export function canAccessPath(role: Role, pathname: string): boolean {
  // Public routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads")
  ) {
    return true;
  }

  // Reporter paths
  if (pathname.startsWith("/requests")) {
    return role === Role.REPORTER || role === Role.ADMIN || role === Role.UNIT_HEAD;
  }

  // Inbox (tickets view for Admin & Unit Head)
  if (pathname.startsWith("/inbox")) {
    return role === Role.ADMIN || role === Role.UNIT_HEAD;
  }

  // Admin-only management paths
  if (
    pathname.startsWith("/tickets/new") ||
    pathname.startsWith("/admin")
  ) {
    return role === Role.ADMIN;
  }

  // Ticket detail path (/tickets/[id])
  if (pathname.startsWith("/tickets/")) {
    return role === Role.ADMIN || role === Role.UNIT_HEAD;
  }

  // Technician paths
  if (pathname.startsWith("/jobs")) {
    return role === Role.TECHNICIAN;
  }

  // Unit Head and Admin dashboard
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/reports")) {
    return role === Role.UNIT_HEAD || role === Role.ADMIN;
  }

  // Common notifications
  if (pathname.startsWith("/notifications")) {
    return true;
  }

  return true;
}

export function enforceRole(currentRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(currentRole);
}
