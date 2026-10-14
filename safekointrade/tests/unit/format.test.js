import { describe, it, expect } from "vitest";
import { toNumber, formatMoney, formatPercent, formatDate, shortId } from "@/lib/utils/format";

describe("format", () => {
  it("parses Postgres numeric strings safely", () => {
    expect(toNumber("1250.50")).toBe(1250.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("")).toBe(0);
    expect(toNumber("nope")).toBe(0);
  });

  it("formats money per locale", () => {
    expect(formatMoney("1250.5")).toBe("$1,250.50");
    expect(formatMoney("1250.5", { locale: "de" })).toMatch(/1\.250,50/);
    expect(formatMoney("0")).toBe("$0.00");
  });

  it("falls back to English for unknown locales", () => {
    expect(formatMoney("10", { locale: "xx" })).toBe("$10.00");
  });

  it("formats signed percentages", () => {
    expect(formatPercent(2.5, { signed: true })).toBe("+2.5%");
    expect(formatPercent(-1, { signed: true })).toBe("-1%");
    expect(formatPercent(0, { signed: true })).toBe("0%");
  });

  it("formats dates in UTC and guards invalid input", () => {
    expect(formatDate("2026-10-13T23:30:00Z")).toBe("Oct 13, 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });

  it("shortens ids", () => {
    expect(shortId("abcdef12-3456")).toBe("ABCDEF12");
    expect(shortId(null)).toBe("—");
  });
});
