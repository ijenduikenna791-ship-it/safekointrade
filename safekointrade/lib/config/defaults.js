/**
 * Default plan and asset settings. These mirror supabase/seed.sql and are only
 * displayed (labelled as defaults) when the database isn't connected yet.
 * Live data always comes from the investment_plans / supported_assets tables.
 */
export const defaultPlans = [
  {
    id: "starter",
    slug: "starter",
    name: "Starter",
    description: "A short first term for getting familiar with how positions open, run and mature.",
    min_amount: "100",
    max_amount: "999.99",
    currency: "USD",
    term_days: 30,
    risk_level: "moderate",
    risk_description: "Exposure to crypto market volatility over a 30-day term.",
    target_return_min: null,
    target_return_max: null,
    is_active: true,
    sort_order: 1,
  },
  {
    id: "growth",
    slug: "growth",
    name: "Growth",
    description: "A quarter-length term for larger positions with room to ride out short-term swings.",
    min_amount: "1000",
    max_amount: "9999.99",
    currency: "USD",
    term_days: 90,
    risk_level: "moderate",
    risk_description: "Exposure to crypto market volatility over a 90-day term.",
    target_return_min: null,
    target_return_max: null,
    is_active: true,
    sort_order: 2,
  },
  {
    id: "premium",
    slug: "premium",
    name: "Premium",
    description: "A six-month term for substantial positions. Longer terms carry more exposure to market moves.",
    min_amount: "10000",
    max_amount: "49999.99",
    currency: "USD",
    term_days: 180,
    risk_level: "high",
    risk_description: "Higher exposure to crypto market volatility over a 180-day term.",
    target_return_min: null,
    target_return_max: null,
    is_active: true,
    sort_order: 3,
  },
];

// coingecko_id is used for live prices.
export const defaultAssets = [
  { symbol: "BTC", name: "Bitcoin", coingecko_id: "bitcoin", network: "Bitcoin", accepts_deposits: true },
  { symbol: "ETH", name: "Ethereum", coingecko_id: "ethereum", network: "Ethereum (ERC-20)", accepts_deposits: true },
  { symbol: "USDT", name: "Tether", coingecko_id: "tether", network: "Ethereum / Tron", accepts_deposits: true },
  { symbol: "USDC", name: "USD Coin", coingecko_id: "usd-coin", network: "Ethereum (ERC-20)", accepts_deposits: true },
  { symbol: "SOL", name: "Solana", coingecko_id: "solana", network: "Solana", accepts_deposits: true },
];
