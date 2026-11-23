import { Role } from "@prisma/client";
import { canAccessPath, getDefaultRedirectForRole, enforceRole } from "@/lib/rbac";

describe("RBAC Helper & Access Permissions", () => {
  describe("getDefaultRedirectForRole", () => {
    it("redirects each role to their designated default home route", () => {
      expect(getDefaultRedirectForRole(Role.REPORTER)).toBe("/requests");
      expect(getDefaultRedirectForRole(Role.ADMIN)).toBe("/inbox");
      expect(getDefaultRedirectForRole(Role.TECHNICIAN)).toBe("/jobs");
      expect(getDefaultRedirectForRole(Role.UNIT_HEAD)).toBe("/dashboard");
    });
  });

  describe("canAccessPath", () => {
    it("allows public routes for any role", () => {
      expect(canAccessPath(Role.REPORTER, "/login")).toBe(true);
      expect(canAccessPath(Role.TECHNICIAN, "/login")).toBe(true);
      expect(canAccessPath(Role.REPORTER, "/api/health")).toBe(true);
    });

    it("restricts reporter from accessing admin inbox or master data", () => {
      expect(canAccessPath(Role.REPORTER, "/inbox")).toBe(false);
      expect(canAccessPath(Role.REPORTER, "/admin/master-data")).toBe(false);
      expect(canAccessPath(Role.REPORTER, "/admin/users")).toBe(false);
    });

    it("restricts technician from accessing admin inbox and reporter requests", () => {
      expect(canAccessPath(Role.TECHNICIAN, "/inbox")).toBe(false);
      expect(canAccessPath(Role.TECHNICIAN, "/requests")).toBe(false);
      expect(canAccessPath(Role.TECHNICIAN, "/admin/users")).toBe(false);
    });

    it("allows technician to access /jobs", () => {
      expect(canAccessPath(Role.TECHNICIAN, "/jobs")).toBe(true);
    });

    it("allows admin to access /inbox, /admin/master-data, and /admin/users", () => {
      expect(canAccessPath(Role.ADMIN, "/inbox")).toBe(true);
      expect(canAccessPath(Role.ADMIN, "/admin/master-data")).toBe(true);
      expect(canAccessPath(Role.ADMIN, "/admin/users")).toBe(true);
      expect(canAccessPath(Role.ADMIN, "/dashboard")).toBe(true);
    });

    it("allows unit head to access /dashboard and /inbox but not /admin/users", () => {
      expect(canAccessPath(Role.UNIT_HEAD, "/dashboard")).toBe(true);
      expect(canAccessPath(Role.UNIT_HEAD, "/inbox")).toBe(true);
      expect(canAccessPath(Role.UNIT_HEAD, "/admin/users")).toBe(false);
    });
  });

  describe("enforceRole", () => {
    it("validates role arrays correctly", () => {
      expect(enforceRole(Role.ADMIN, [Role.ADMIN, Role.UNIT_HEAD])).toBe(true);
      expect(enforceRole(Role.REPORTER, [Role.ADMIN])).toBe(false);
    });
  });
});
