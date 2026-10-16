import "server-only";

/**
 * CoinGecko market data. Server-side only so an API key never reaches the
 * browser. Responses are cached by Next for 60s (prices) / 1h (history).
 * Every function returns null on failure — callers show an "unavailable"
 * state rather than invented numbers.
 */
// Set COINGECKO_PRO=true when using a paid Pro key; demo keys use the public host.
// COINGECKO_BASE_URL is only for tests (pointing at a local mock server).
const BASE =
  process.env.COINGECKO_BASE_URL ||
  (process.env.COINGECKO_PRO === "true" ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3");

// Last good responses, kept in memory so a rate-limited request can fall back
// to recent real data instead of going blank. Never invented values.
const memory = new Map(); // key -> { at, data }
const FRESH_MS = 60_000;
const STALE_OK_MS = 15 * 60_000;

async function cg(path, { revalidate = 60 } = {}) {
  const hit = memory.get(path);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;

  const headers = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) {
    headers[BASE.includes("pro-api") ? "x-cg-pro-api-key" : "x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers,
      next: { revalidate },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.warn(`[market] CoinGecko ${res.status} for ${path.split("?")[0]}${res.status === 429 ? " (rate limited — consider COINGECKO_API_KEY)" : ""}`);
      return hit && Date.now() - hit.at < STALE_OK_MS ? hit.data : null;
    }
    const data = await res.json();
    memory.set(path, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.warn(`[market] CoinGecko request failed: ${err?.name || err}`);
    return hit && Date.now() - hit.at < STALE_OK_MS ? hit.data : null;
  }
}

// Every page asks for the same canonical set, so one cached request serves
// the ticker, hero cards, asset table and dashboard.
const CORE_IDS = ["binancecoin", "bitcoin", "ethereum", "euro-coin", "solana", "tether", "usd-coin"];

/**
 * One request: price, 24h change and a 7-day hourly sparkline per coin.
 * Returns { [id]: { usd, usd_24h_change, sparkline: number[] } } or null.
 */
export async function getMarkets(ids = []) {
  const all = [...new Set([...CORE_IDS, ...ids.filter(Boolean)])].sort();
  const data = await cg(
    `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(all.join(","))}&sparkline=true&price_change_percentage=24h&per_page=${all.length}`
  );
  if (!Array.isArray(data) || !data.length) return null;
  const out = {};
  for (const c of data) {
    if (typeof c?.current_price !== "number") continue;
    out[c.id] = {
      usd: c.current_price,
      usd_24h_change: typeof c.price_change_percentage_24h === "number" ? c.price_change_percentage_24h : null,
      sparkline: Array.isArray(c.sparkline_in_7d?.price) ? c.sparkline_in_7d.price.filter((v) => typeof v === "number") : [],
    };
  }
  return Object.keys(out).length ? out : null;
}

/** { [coingeckoId]: { usd, usd_24h_change } } — served from getMarkets. */
export async function getPrices(ids) {
  if (!ids?.length) return null;
  const markets = await getMarkets(ids);
  if (!markets) return null;
  const out = {};
  for (const id of ids) if (markets[id]) out[id] = { usd: markets[id].usd, usd_24h_change: markets[id].usd_24h_change };
  return Object.keys(out).length ? out : null;
}

/** Daily closes for the last `days` days: [{ t, price }] */
export async function getHistory(id, days = 30) {
  const data = await cg(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}&interval=daily`, {
    revalidate: 3600,
  });
  if (!Array.isArray(data?.prices) || data.prices.length < 2) return null;
  return data.prices.map(([t, price]) => ({ t, price }));
}
