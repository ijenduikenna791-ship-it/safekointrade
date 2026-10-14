import { describe, it, expect, vi } from "vitest";
import { applySearch } from "@/lib/database/search";

// A fake Supabase builder: chainable AND thenable, like the real one.
function fakeBuilder(log = []) {
  const b = {
    log,
    ilike: (...a) => (log.push(["ilike", ...a]), b),
    in: (...a) => (log.push(["in", ...a]), b),
    order: (...a) => (log.push(["order", ...a]), b),
    then: vi.fn((resolve) => resolve({ data: [], executed: true })),
  };
  return b;
}

describe("applySearch", () => {
  it("returns a still-chainable builder (never executes it)", async () => {
    const q = fakeBuilder();
    const { query } = await applySearch({}, q, "DEP-12");
    expect(typeof query.order).toBe("function");
    expect(q.then).not.toHaveBeenCalled();
    expect(q.log[0]).toEqual(["ilike", "reference", "%DEP-12%"]);
  });

  it("returns the builder untouched for an empty term", async () => {
    const q = fakeBuilder();
    const { query } = await applySearch({}, q, "  ");
    expect(query).toBe(q);
    expect(q.then).not.toHaveBeenCalled();
  });

  it("searches by user email via profiles", async () => {
    const q = fakeBuilder();
    const supabase = { from: () => ({ select: () => ({ ilike: () => ({ limit: async () => ({ data: [{ id: "u1" }] }) }) }) }) };
    const { query } = await applySearch(supabase, q, "ada@example.com");
    expect(typeof query.order).toBe("function");
    expect(q.log[0][0]).toBe("in");
    expect(q.log[0][2]).toContain("u1");
  });
});
