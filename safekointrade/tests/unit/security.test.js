import { describe, it, expect } from "vitest";
import { safeNextPath, isSameOrigin } from "@/lib/security/request";

describe("safeNextPath", () => {
  it.each(["/dashboard", "/fr/dashboard/deposits?page=2", "/admin"])("allows %s", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "dashboard",
    "/ok\r\nSet-Cookie: x=1",
    null,
    42,
  ])("rejects %s", (p) => {
    expect(safeNextPath(p)).toBe("/dashboard");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//x", "/admin")).toBe("/admin");
  });
});

describe("isSameOrigin", () => {
  const req = (h) => ({ headers: new Headers(h) });

  it("accepts a matching origin", () => {
    expect(isSameOrigin(req({ origin: "https://app.example.com", host: "app.example.com" }))).toBe(true);
  });

  it("rejects a foreign origin", () => {
    expect(isSameOrigin(req({ origin: "https://evil.example", host: "app.example.com" }))).toBe(false);
  });

  it("rejects a missing origin", () => {
    expect(isSameOrigin(req({ host: "app.example.com" }))).toBe(false);
  });
});
