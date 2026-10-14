import { describe, it, expect, vi, beforeEach } from "vitest";

const sample = [
  { id: "bitcoin", current_price: 81501, price_change_percentage_24h: -2.27, sparkline_in_7d: { price: [80000, 81000, 81501] } },
  { id: "ethereum", current_price: 2410.23, price_change_percentage_24h: -3.94, sparkline_in_7d: { price: [2500, 2450, 2410] } },
  { id: "solana", current_price: 104.33, price_change_percentage_24h: null, sparkline_in_7d: { price: [] } },
];

describe("market data", () => {
  beforeEach(() => vi.resetModules());

  it("makes one request for every page's coins and maps the fields", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => sample }));
    vi.stubGlobal("fetch", fetchMock);
    const { getMarkets, getPrices } = await import("@/lib/market/coingecko");
    const m = await getMarkets(["bitcoin"]);
    expect(m.bitcoin).toEqual({ usd: 81501, usd_24h_change: -2.27, sparkline: [80000, 81000, 81501] });
    expect(m.solana.usd_24h_change).toBeNull();
    // A different subset reuses the same cached response — no second request.
    const p = await getPrices(["ethereum", "solana"]);
    expect(p.ethereum).toEqual({ usd: 2410.23, usd_24h_change: -3.94 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/coins/markets");
  });

  it("returns null (not made-up numbers) when the provider refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getMarkets } = await import("@/lib/market/coingecko");
    expect(await getMarkets(["bitcoin"])).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
