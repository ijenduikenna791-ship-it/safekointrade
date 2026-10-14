-- =============================================================================
-- Development seed — safe to run repeatedly. Contains NO users, passwords or
-- balances. Create accounts through the app, then promote the first owner with
-- scripts/bootstrap-admin.js (see README).
-- =============================================================================

insert into public.supported_assets (symbol, name, coingecko_id, network, sort_order) values
  ('BTC',  'Bitcoin',  'bitcoin',  'Bitcoin',           1),
  ('ETH',  'Ethereum', 'ethereum', 'Ethereum (ERC-20)', 2),
  ('USDT', 'Tether',   'tether',   'Ethereum / Tron',   3),
  ('USDC', 'USD Coin', 'usd-coin', 'Ethereum (ERC-20)', 4),
  ('SOL',  'Solana',   'solana',   'Solana',            5)
on conflict (symbol) do nothing;

-- Sample plan categories. No return targets are set: a target may only be
-- added together with a published basis (enforced by a CHECK constraint).
insert into public.investment_plans
  (slug, name, description, min_amount, max_amount, currency, term_days, risk_level, risk_description, sort_order)
values
  ('starter', 'Starter',
   'A short first term for getting familiar with how positions open, run and mature.',
   100, 999.99, 'USD', 30, 'moderate', 'Exposure to crypto market volatility over a 30-day term.', 1),
  ('growth', 'Growth',
   'A quarter-length term for larger positions with room to ride out short-term swings.',
   1000, 9999.99, 'USD', 90, 'moderate', 'Exposure to crypto market volatility over a 90-day term.', 2),
  ('premium', 'Premium',
   'A six-month term for substantial positions. Longer terms carry more exposure to market moves.',
   10000, 49999.99, 'USD', 180, 'high', 'Higher exposure to crypto market volatility over a 180-day term.', 3)
on conflict (slug) do nothing;
