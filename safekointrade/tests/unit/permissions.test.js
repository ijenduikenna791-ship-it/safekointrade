import { describe, it, expect } from "vitest";
import { can, PERMISSIONS, ROLES } from "@/lib/authorization/permissions";

describe("permissions", () => {
  it("denies customers (no roles) everything", () => {
    for (const p of Object.keys(PERMISSIONS)) expect(can([], p)).toBe(false);
    expect(can(undefined, "admin.view")).toBe(false);
  });

  it("denies unknown permissions even for owners", () => {
    expect(can(["owner"], "does.not.exist")).toBe(false);
  });

  it("only uses known roles", () => {
    for (const roles of Object.values(PERMISSIONS)) for (const r of roles) expect(ROLES).toContain(r);
  });

  it("keeps money review away from support", () => {
    expect(can(["support"], "finance.review")).toBe(false);
    expect(can(["finance"], "finance.review")).toBe(true);
  });

  it("keeps settings and audit away from finance and support", () => {
    for (const r of ["finance", "support"]) {
      expect(can([r], "settings.manage")).toBe(false);
      expect(can([r], "audit.view")).toBe(false);
      expect(can([r], "roles.manage")).toBe(false);
    }
  });

  it("lets only owners manage admins", () => {
    expect(can(["admin"], "roles.manageAdmins")).toBe(false);
    expect(can(["owner"], "roles.manageAdmins")).toBe(true);
  });

  it("combines multiple roles", () => {
    expect(can(["support", "finance"], "finance.review")).toBe(true);
  });
});
