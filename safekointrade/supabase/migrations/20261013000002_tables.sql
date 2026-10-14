-- =============================================================================
-- 0002 · Core tables
-- =============================================================================

-- Profiles ---------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  full_name       text not null default '' check (char_length(full_name) <= 100),
  username        text unique check (username ~ '^[a-z0-9_]{3,40}$'),
  phone           text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  phone_verified  boolean not null default false,
  country         text check (country is null or country ~ '^[A-Z]{2}$'),
  locale          text not null default 'en' check (locale in ('en','fr','es','pt','ar','de','zh','yo')),
  theme           text not null default 'system' check (theme in ('light','dark','system')),
  status          text not null default 'active' check (status in ('active','suspended')),
  status_reason   text,
  kyc_status      text not null default 'unverified' check (kyc_status in ('unverified','pending','verified','rejected')),
  referral_code   text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referred_by     uuid references public.profiles (id) on delete set null,
  terms_accepted_at timestamptz,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_status_idx on public.profiles (status);
create index profiles_created_idx on public.profiles (created_at desc);
create index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Staff roles --------------------------------------------------------------------
-- A user can hold several roles. Rows are only written by owner/admin functions
-- or the server-side bootstrap script — never by the user themselves.
create table public.user_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('owner','admin','finance','support')),
  granted_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);

-- Balances -------------------------------------------------------------------------
-- One row per user. Columns can only change inside SECURITY DEFINER functions,
-- which lock the row first. CHECKs make negative balances impossible.
create table public.balances (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  currency    text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  available   numeric(20,2) not null default 0 check (available >= 0),
  held        numeric(20,2) not null default 0 check (held >= 0),      -- pending withdrawals
  invested    numeric(20,2) not null default 0 check (invested >= 0),  -- active positions
  updated_at  timestamptz not null default now()
);
create trigger balances_updated_at before update on public.balances
  for each row execute function public.set_updated_at();

-- Supported assets ---------------------------------------------------------------
create table public.supported_assets (
  symbol            text primary key check (symbol ~ '^[A-Z0-9]{2,10}$'),
  name              text not null,
  coingecko_id      text,
  network           text not null,
  accepts_deposits  boolean not null default true,
  accepts_withdrawals boolean not null default true,
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger supported_assets_updated_at before update on public.supported_assets
  for each row execute function public.set_updated_at();

-- Investment plans ---------------------------------------------------------------
create table public.investment_plans (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name                text not null,
  description         text not null,
  min_amount          numeric(20,2) not null check (min_amount > 0),
  max_amount          numeric(20,2) not null,
  currency            text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  term_days           int not null check (term_days between 1 and 3650),
  risk_level          text not null check (risk_level in ('low','moderate','high')),
  risk_description    text not null,
  -- Optional, and only meaningful together with a published basis.
  target_return_min   numeric(6,2),
  target_return_max   numeric(6,2),
  target_return_basis text,
  is_active           boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (max_amount > min_amount),
  check (
    (target_return_min is null and target_return_max is null)
    or (target_return_min is not null and target_return_max is not null
        and target_return_max >= target_return_min
        and coalesce(char_length(target_return_basis), 0) >= 10)
  )
);
create index investment_plans_active_idx on public.investment_plans (is_active, sort_order);
create trigger investment_plans_updated_at before update on public.investment_plans
  for each row execute function public.set_updated_at();

-- Investments (positions) --------------------------------------------------------
create table public.investments (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique default public.make_reference('INV'),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  plan_id          uuid not null references public.investment_plans (id) on delete restrict,
  plan_name        text not null,             -- snapshot at opening
  term_days        int not null,              -- snapshot at opening
  amount           numeric(20,2) not null check (amount > 0),
  currency         text not null default 'USD',
  status           text not null default 'active' check (status in ('active','matured','cancelled')),
  started_at       timestamptz not null default now(),
  matures_at       timestamptz not null,
  matured_at       timestamptz,
  cancelled_at     timestamptz,
  idempotency_key  uuid not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index investments_user_idx on public.investments (user_id, created_at desc);
create index investments_status_idx on public.investments (status, matures_at);
create trigger investments_updated_at before update on public.investments
  for each row execute function public.set_updated_at();

-- Deposit requests -----------------------------------------------------------------
create table public.deposit_requests (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique default public.make_reference('DEP'),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  amount           numeric(20,2) not null check (amount > 0),
  credited_amount  numeric(20,2) check (credited_amount is null or credited_amount > 0),
  currency         text not null default 'USD',
  asset_symbol     text not null references public.supported_assets (symbol),
  method           text not null check (method in ('crypto_transfer','bank_transfer')),
  tx_reference     text check (char_length(tx_reference) <= 140),
  note             text check (char_length(note) <= 500),
  receipt_path     text,
  status           text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  reviewed_by      uuid references public.profiles (id) on delete set null,
  review_note      text check (char_length(review_note) <= 500),
  reviewed_at      timestamptz,
  completed_at     timestamptz,
  idempotency_key  uuid not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index deposit_requests_user_idx on public.deposit_requests (user_id, created_at desc);
create index deposit_requests_status_idx on public.deposit_requests (status, created_at);
create trigger deposit_requests_updated_at before update on public.deposit_requests
  for each row execute function public.set_updated_at();

-- Withdrawal requests --------------------------------------------------------------
create table public.withdrawal_requests (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.make_reference('WDR'),
  user_id           uuid not null references public.profiles (id) on delete restrict,
  amount            numeric(20,2) not null check (amount > 0),   -- debited from balance
  fee               numeric(20,2) not null default 0 check (fee >= 0),
  net_amount        numeric(20,2) not null check (net_amount > 0), -- paid out
  currency          text not null default 'USD',
  asset_symbol      text not null references public.supported_assets (symbol),
  network           text not null,
  destination       text not null check (char_length(destination) between 10 and 128),
  status            text not null default 'pending'
                    check (status in ('pending','processing','approved','rejected','completed','cancelled')),
  reviewed_by       uuid references public.profiles (id) on delete set null,
  review_note       text check (char_length(review_note) <= 500),
  reviewed_at       timestamptz,
  completed_by      uuid references public.profiles (id) on delete set null,
  payout_reference  text check (char_length(payout_reference) <= 140),
  completed_at      timestamptz,
  idempotency_key   uuid not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (net_amount = amount - fee)
);
create index withdrawal_requests_user_idx on public.withdrawal_requests (user_id, created_at desc);
create index withdrawal_requests_status_idx on public.withdrawal_requests (status, created_at);
create trigger withdrawal_requests_updated_at before update on public.withdrawal_requests
  for each row execute function public.set_updated_at();

-- Transactions: the ledger -----------------------------------------------------------
-- Append-only. Every balance change writes exactly one row with the deltas
-- applied to each bucket and the resulting balances.
create table public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique default public.make_reference('TXN'),
  user_id            uuid not null references public.profiles (id) on delete restrict,
  type               text not null check (type in (
                       'deposit', 'withdrawal_hold', 'withdrawal_release', 'withdrawal_payout',
                       'investment_open', 'investment_cancel', 'investment_maturity')),
  amount             numeric(20,2) not null check (amount > 0),
  currency           text not null default 'USD',
  delta_available    numeric(20,2) not null default 0,
  delta_held         numeric(20,2) not null default 0,
  delta_invested     numeric(20,2) not null default 0,
  available_after    numeric(20,2) not null,
  held_after         numeric(20,2) not null,
  invested_after     numeric(20,2) not null,
  source_type        text not null check (source_type in ('deposit','withdrawal','investment')),
  source_id          uuid not null,
  description        text not null,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, created_at desc);
create index transactions_source_idx on public.transactions (source_type, source_id);
create index transactions_type_idx on public.transactions (type, created_at desc);
create trigger transactions_append_only before update or delete on public.transactions
  for each row execute function public.prevent_mutation();

-- Notifications --------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('deposit','withdrawal','investment','security','support','announcement','account')),
  title       text not null check (char_length(title) <= 160),
  body        text not null check (char_length(body) <= 2000),
  template    text,                                   -- i18n key rendered by the app
  params      jsonb not null default '{}'::jsonb,     -- values for the template
  link        text check (link is null or link ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  email_deposits     boolean not null default true,
  email_withdrawals  boolean not null default true,
  email_investments  boolean not null default true,
  email_security     boolean not null default true,
  email_product      boolean not null default false,
  updated_at         timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Support ----------------------------------------------------------------------------
create table public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique default public.make_reference('SUP'),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  subject      text not null check (char_length(subject) between 4 and 140),
  category     text not null check (category in ('account','deposit','withdrawal','investment','security','other')),
  status       text not null default 'open' check (status in ('open','answered','closed')),
  priority     text not null default 'normal' check (priority in ('low','normal','high')),
  assigned_to  uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, last_message_at desc);
create index support_tickets_status_idx on public.support_tickets (status, last_message_at desc);
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  is_staff    boolean not null default false,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
create trigger support_messages_append_only before update or delete on public.support_messages
  for each row execute function public.prevent_mutation();

-- Audit log --------------------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_roles  text[] not null default '{}',
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_action_idx on public.audit_logs (action);
create trigger audit_logs_append_only before update or delete on public.audit_logs
  for each row execute function public.prevent_mutation();

-- Newsletter -------------------------------------------------------------------------
create table public.newsletter_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique check (email = lower(email) and char_length(email) <= 254),
  locale             text not null default 'en',
  consent_text       text not null,
  consented_at       timestamptz not null default now(),
  unsubscribed_at    timestamptz,
  unsubscribe_token  uuid not null unique default gen_random_uuid(),
  created_at         timestamptz not null default now()
);

-- Application settings ---------------------------------------------------------------
create table public.application_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,  -- readable by signed-in users
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger application_settings_updated_at before update on public.application_settings
  for each row execute function public.set_updated_at();

-- Rate limiting ----------------------------------------------------------------------
create table public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null,
  count         int not null
);
