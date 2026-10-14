-- SafeKoinTrade: full database setup (all migrations + seed, in order).
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Run it ONCE on a fresh project.

-- ============================================================
-- supabase/migrations/20261013000001_helpers.sql
-- ============================================================
-- =============================================================================
-- 0001 · Helper functions shared by tables, RLS policies and business logic
-- =============================================================================
-- Conventions used across all migrations:
--   * money is numeric(20,2) and never negative where it represents a balance
--   * every SECURITY DEFINER function sets search_path = '' and fully
--     qualifies names, so it can't be hijacked by objects in other schemas
--   * EXECUTE is revoked from PUBLIC and granted explicitly
-- =============================================================================

-- updated_at maintenance ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Human-readable references, e.g. DEP-3F9A1C07B2 ---------------------------------
create or replace function public.make_reference(prefix text)
returns text
language sql
volatile
set search_path = ''
as $$
  select prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- Append-only guard: attach to tables whose rows must never change ----------------
create or replace function public.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Rows in %.% are append-only', tg_table_schema, tg_table_name
    using errcode = '42501';
end;
$$;

-- Application error helper: raises with a stable code the app maps to messages.
-- errcode P0001 + message 'app:<code>' is parsed by lib/database/errors.js.
create or replace function public.app_error(code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'app:%', code using errcode = 'P0001';
end;
$$;

revoke execute on function public.app_error(text) from public, anon, authenticated;


-- ============================================================
-- supabase/migrations/20261013000002_tables.sql
-- ============================================================
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


-- ============================================================
-- supabase/migrations/20261013000003_auth_rls.sql
-- ============================================================
-- =============================================================================
-- 0003 · Role helpers, new-user provisioning, Row Level Security
-- =============================================================================

-- Role helpers ------------------------------------------------------------------
-- SECURITY DEFINER so policies can read user_roles without recursive RLS.
create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = any (roles)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_any_role(array['owner','admin','finance','support']);
$$;

-- Staff who enrolled an authenticator must be signed in with it (aal2) before
-- any privileged action. Staff without a factor are prompted to enrol in the UI.
create or replace function public.meets_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

-- Privileged gate used by every admin function.
create or replace function public.require_role(roles text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then perform public.app_error('unauthorized'); end if;
  if not public.has_any_role(roles) then perform public.app_error('forbidden'); end if;
  if not public.meets_mfa() then perform public.app_error('mfa_required'); end if;
end;
$$;

create or replace function public.current_roles()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(role order by role), '{}') from public.user_roles where user_id = auth.uid();
$$;

-- Audit helper (called only from other SECURITY DEFINER functions) -----------------
create or replace function public.log_audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, actor_roles, action, entity_type, entity_id, details)
  values (auth.uid(), public.current_roles(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Notification helper ------------------------------------------------------------
-- title/body are the English fallback; the app renders `template` with `params`
-- in the reader's language when a translation exists.
create or replace function public.notify_user(
  p_user uuid, p_type text, p_template text, p_params jsonb, p_title text, p_body text, p_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, template, params, title, body, link)
  values (p_user, p_type, p_template, coalesce(p_params, '{}'::jsonb), p_title, p_body, p_link);
$$;

-- New user provisioning -----------------------------------------------------------
-- Runs when Supabase Auth creates a user. Copies sign-up metadata (validated
-- again on the server before sign-up) into a profile, and creates the balance
-- and preference rows. Never grants roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username  text  := lower(nullif(trim(meta ->> 'username'), ''));
  v_phone     text  := nullif(trim(meta ->> 'phone'), '');
  v_referrer  uuid;
begin
  if v_username is not null and (v_username !~ '^[a-z0-9_]{3,24}$') then
    v_username := null;
  end if;
  -- Extremely rare race: someone took the username after our availability check.
  if v_username is not null and exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    v_phone := null;
  end if;
  if nullif(meta ->> 'referral_code', '') is not null then
    select id into v_referrer from public.profiles where referral_code = upper(meta ->> 'referral_code');
  end if;

  insert into public.profiles (id, email, full_name, username, phone, referred_by, locale, terms_accepted_at)
  values (
    new.id,
    lower(new.email),
    left(coalesce(meta ->> 'full_name', ''), 100),
    v_username,
    v_phone,
    v_referrer,
    case when meta ->> 'locale' in ('en','fr','es','pt','ar','de','zh','yo') then meta ->> 'locale' else 'en' end,
    case when (meta ->> 'terms_accepted')::boolean is true then now() end
  );
  insert into public.balances (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when a user confirms an email change.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- A changed phone number is no longer verified.
create or replace function public.reset_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone then new.phone_verified := false; end if;
  return new;
end;
$$;
create trigger profiles_phone_changed before update of phone on public.profiles
  for each row execute function public.reset_phone_verification();

-- Username availability (used by the sign-up form; reveals nothing else).
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,24}$'
     and not exists (select 1 from public.profiles where username = lower(p_username));
$$;

-- =============================================================================
-- Privileges: clients never write financial tables directly.
-- =============================================================================
revoke all on all tables in schema public from anon, authenticated;

grant select on public.supported_assets, public.investment_plans to anon, authenticated;
grant select on
  public.profiles, public.user_roles, public.balances, public.investments,
  public.deposit_requests, public.withdrawal_requests, public.transactions,
  public.notifications, public.notification_preferences, public.support_tickets,
  public.support_messages, public.audit_logs, public.newsletter_subscriptions,
  public.application_settings
to authenticated;

-- Column-level update rights: only harmless profile fields are editable.
grant update (full_name, phone, country, locale, theme, last_seen_at) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
grant update (email_deposits, email_withdrawals, email_investments, email_security, email_product)
  on public.notification_preferences to authenticated;

-- =============================================================================
-- Row Level Security — enabled on every table.
-- =============================================================================
alter table public.profiles                  enable row level security;
alter table public.user_roles                enable row level security;
alter table public.balances                  enable row level security;
alter table public.supported_assets          enable row level security;
alter table public.investment_plans          enable row level security;
alter table public.investments               enable row level security;
alter table public.deposit_requests          enable row level security;
alter table public.withdrawal_requests       enable row level security;
alter table public.transactions              enable row level security;
alter table public.notifications             enable row level security;
alter table public.notification_preferences  enable row level security;
alter table public.support_tickets           enable row level security;
alter table public.support_messages          enable row level security;
alter table public.audit_logs                enable row level security;
alter table public.newsletter_subscriptions  enable row level security;
alter table public.application_settings      enable row level security;
alter table public.rate_limits               enable row level security; -- no policies: service role only

-- Profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: staff read" on public.profiles
  for select to authenticated using ((select public.is_staff()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Roles
create policy "user_roles: read own" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_roles: admins read all" on public.user_roles
  for select to authenticated using ((select public.has_any_role(array['owner','admin'])));

-- Balances
create policy "balances: read own" on public.balances
  for select to authenticated using (user_id = (select auth.uid()));
create policy "balances: staff read" on public.balances
  for select to authenticated using ((select public.is_staff()));

-- Public catalogue
create policy "supported_assets: read active" on public.supported_assets
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy "investment_plans: read active" on public.investment_plans
  for select to anon, authenticated using (is_active or (select public.is_staff()));

-- Investments / deposits / withdrawals / ledger: own rows, or staff
create policy "investments: read own" on public.investments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "investments: staff read" on public.investments
  for select to authenticated using ((select public.is_staff()));

create policy "deposits: read own" on public.deposit_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "deposits: staff read" on public.deposit_requests
  for select to authenticated using ((select public.is_staff()));

create policy "withdrawals: read own" on public.withdrawal_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "withdrawals: staff read" on public.withdrawal_requests
  for select to authenticated using ((select public.is_staff()));

create policy "transactions: read own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions: staff read" on public.transactions
  for select to authenticated using ((select public.is_staff()));

-- Notifications
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "notification_preferences: read own" on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));
-- Staff read preferences so customer emails sent on their actions respect opt-outs.
create policy "notification_preferences: staff read" on public.notification_preferences
  for select to authenticated using ((select public.is_staff()));
create policy "notification_preferences: update own" on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Support
create policy "tickets: read own" on public.support_tickets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tickets: support staff read" on public.support_tickets
  for select to authenticated using ((select public.has_any_role(array['owner','admin','support'])));

create policy "messages: read own ticket" on public.support_messages
  for select to authenticated using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = (select auth.uid()))
  );
create policy "messages: support staff read" on public.support_messages
  for select to authenticated using ((select public.has_any_role(array['owner','admin','support'])));

-- Audit log: owners and admins only
create policy "audit_logs: admins read" on public.audit_logs
  for select to authenticated using ((select public.has_any_role(array['owner','admin'])));

-- Newsletter list: owners and admins only (writes go through subscribe_newsletter)
create policy "newsletter: admins read" on public.newsletter_subscriptions
  for select to authenticated using ((select public.has_any_role(array['owner','admin'])));

-- Settings: public keys for signed-in users, everything for admins
create policy "settings: read public" on public.application_settings
  for select to authenticated using (is_public or (select public.has_any_role(array['owner','admin','finance'])));

-- Function privileges ----------------------------------------------------------------
revoke execute on function public.has_any_role(text[]) from public, anon, authenticated;
revoke execute on function public.is_staff() from public, anon, authenticated;
revoke execute on function public.meets_mfa() from public, anon, authenticated;
revoke execute on function public.require_role(text[]) from public, anon, authenticated;
revoke execute on function public.current_roles() from public, anon, authenticated;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, text, text, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.is_username_available(text) from public, anon, authenticated;

grant execute on function public.has_any_role(text[]) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.meets_mfa() to authenticated;
grant execute on function public.current_roles() to authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;


-- ============================================================
-- supabase/migrations/20261013000004_user_operations.sql
-- ============================================================
-- =============================================================================
-- 0004 · User-facing operations (deposits, withdrawals, investments, support)
-- =============================================================================
-- Every balance change:
--   1. locks the user's balances row (SELECT … FOR UPDATE) — serialises
--      concurrent requests, so double-spending is impossible
--   2. validates against the locked values and settings
--   3. updates balances (CHECK constraints forbid negatives as a backstop)
--   4. writes one append-only ledger row with deltas and resulting balances
--   5. writes an audit log entry
-- all inside the function's single transaction. Idempotency keys make retries safe.
-- =============================================================================

-- Settings helpers -----------------------------------------------------------------
create or replace function public.setting_num(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (s.value #>> '{}')::numeric from public.application_settings s where s.key = p_key),
    p_default
  );
$$;

create or replace function public.setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (s.value #>> '{}')::boolean from public.application_settings s where s.key = p_key),
    p_default
  );
$$;

-- Caller must be signed in, active, and the platform not in maintenance.
create or replace function public.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then perform public.app_error('unauthorized'); end if;
  select status into v_status from public.profiles where id = v_uid;
  if v_status is null then perform public.app_error('unauthorized'); end if;
  if v_status <> 'active' then perform public.app_error('account_suspended'); end if;
  if public.setting_bool('maintenance_mode', false) then perform public.app_error('maintenance'); end if;
  return v_uid;
end;
$$;

create or replace function public.validate_amount(p_amount numeric)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount > 999999999999 then
    perform public.app_error('amount_invalid');
  end if;
end;
$$;

-- Ledger writer: applies deltas to an already-locked balances row ------------------
create or replace function public.apply_ledger(
  p_user uuid, p_type text, p_amount numeric,
  p_d_available numeric, p_d_held numeric, p_d_invested numeric,
  p_source_type text, p_source_id uuid, p_description text
)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.balances;
  t public.transactions;
begin
  update public.balances
     set available = available + p_d_available,
         held      = held + p_d_held,
         invested  = invested + p_d_invested
   where user_id = p_user
  returning * into b;
  if not found then perform public.app_error('balance_missing'); end if;

  insert into public.transactions (
    user_id, type, amount, delta_available, delta_held, delta_invested,
    available_after, held_after, invested_after, source_type, source_id, description, created_by
  ) values (
    p_user, p_type, p_amount, p_d_available, p_d_held, p_d_invested,
    b.available, b.held, b.invested, p_source_type, p_source_id, p_description, auth.uid()
  ) returning * into t;
  return t;
exception
  when check_violation then
    perform public.app_error('insufficient_funds');
end;
$$;

create or replace function public.lock_balance(p_user uuid)
returns public.balances
language plpgsql
security definer
set search_path = ''
as $$
declare b public.balances;
begin
  select * into b from public.balances where user_id = p_user for update;
  if not found then perform public.app_error('balance_missing'); end if;
  return b;
end;
$$;

-- =============================================================================
-- Deposits
-- A request never changes the balance. Only a finance reviewer's approval
-- (review_deposit, migration 0005) credits funds.
-- =============================================================================
create or replace function public.request_deposit(
  p_amount numeric, p_asset text, p_method text, p_tx_reference text, p_note text, p_idempotency_key uuid
)
returns public.deposit_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_active_user();
  v_row public.deposit_requests;
begin
  if p_idempotency_key is null then perform public.app_error('invalid_request'); end if;
  select * into v_row from public.deposit_requests where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  perform public.validate_amount(p_amount);
  if p_amount < public.setting_num('deposit_min', 10) then perform public.app_error('amount_below_min'); end if;
  if p_amount > public.setting_num('deposit_max', 1000000) then perform public.app_error('amount_above_max'); end if;
  if p_method not in ('crypto_transfer', 'bank_transfer') then perform public.app_error('method_invalid'); end if;
  if not exists (
    select 1 from public.supported_assets a where a.symbol = upper(p_asset) and a.is_active and a.accepts_deposits
  ) then perform public.app_error('asset_invalid'); end if;
  if (select count(*) from public.deposit_requests where user_id = v_uid and status = 'pending') >= 5 then
    perform public.app_error('too_many_pending');
  end if;

  begin
    insert into public.deposit_requests (user_id, amount, asset_symbol, method, tx_reference, note, idempotency_key)
    values (v_uid, p_amount, upper(p_asset), p_method, nullif(trim(p_tx_reference), ''), nullif(trim(p_note), ''), p_idempotency_key)
    returning * into v_row;
  exception when unique_violation then
    -- concurrent retry with the same key won the race — return its row
    select * into v_row from public.deposit_requests where user_id = v_uid and idempotency_key = p_idempotency_key;
    return v_row;
  end;

  perform public.log_audit('deposit.requested', 'deposit_request', v_row.id::text,
    jsonb_build_object('reference', v_row.reference, 'amount', p_amount, 'asset', v_row.asset_symbol));
  perform public.notify_user(v_uid, 'deposit', 'depositRequested', jsonb_build_object('reference', v_row.reference), 'Deposit request received',
    'Your deposit request ' || v_row.reference || ' is pending review. Your balance changes only after the funds are confirmed.',
    '/dashboard/deposits');
  return v_row;
end;
$$;

-- Attach an uploaded receipt (path inside the private "receipts" bucket).
create or replace function public.attach_deposit_receipt(p_deposit uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.require_active_user();
begin
  if p_path is null or p_path !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]{1,120}$') then
    perform public.app_error('invalid_request');
  end if;
  update public.deposit_requests set receipt_path = p_path
   where id = p_deposit and user_id = v_uid and status = 'pending';
  if not found then perform public.app_error('not_found'); end if;
end;
$$;

-- =============================================================================
-- Withdrawals
-- Request: available -> held. Reject/cancel: held -> available.
-- Complete (operator confirms payout): held -> paid out.
-- =============================================================================
create or replace function public.withdrawal_fee(p_amount numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select round(public.setting_num('withdrawal_fee_flat', 0) + p_amount * public.setting_num('withdrawal_fee_percent', 0) / 100, 2);
$$;

create or replace function public.request_withdrawal(
  p_amount numeric, p_asset text, p_network text, p_destination text, p_idempotency_key uuid
)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.require_active_user();
  v_row  public.withdrawal_requests;
  v_bal  public.balances;
  v_fee  numeric;
begin
  if p_idempotency_key is null then perform public.app_error('invalid_request'); end if;
  select * into v_row from public.withdrawal_requests where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  perform public.validate_amount(p_amount);
  if p_amount < public.setting_num('withdrawal_min', 20) then perform public.app_error('amount_below_min'); end if;
  if p_amount > public.setting_num('withdrawal_max', 50000) then perform public.app_error('amount_above_max'); end if;
  if p_destination is null or p_destination !~ '^[A-Za-z0-9:._-]{10,128}$' then perform public.app_error('destination_invalid'); end if;
  if coalesce(trim(p_network), '') = '' or char_length(p_network) > 40 then perform public.app_error('network_invalid'); end if;
  if not exists (
    select 1 from public.supported_assets a where a.symbol = upper(p_asset) and a.is_active and a.accepts_withdrawals
  ) then perform public.app_error('asset_invalid'); end if;

  v_fee := public.withdrawal_fee(p_amount);
  if p_amount - v_fee <= 0 then perform public.app_error('amount_below_fee'); end if;

  -- Lock first: everything below sees a consistent balance.
  v_bal := public.lock_balance(v_uid);
  -- A concurrent retry with the same key may have finished while we waited.
  select * into v_row from public.withdrawal_requests where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  if (select count(*) from public.withdrawal_requests
       where user_id = v_uid and status in ('pending','processing','approved')) >= 3 then
    perform public.app_error('too_many_pending');
  end if;
  -- Same amount to the same destination within two minutes looks like a double submit.
  if exists (select 1 from public.withdrawal_requests
              where user_id = v_uid and amount = p_amount and destination = p_destination
                and status = 'pending' and created_at > now() - interval '2 minutes') then
    perform public.app_error('duplicate_request');
  end if;
  if v_bal.available < p_amount then perform public.app_error('insufficient_funds'); end if;

  insert into public.withdrawal_requests (user_id, amount, fee, net_amount, asset_symbol, network, destination, idempotency_key)
  values (v_uid, p_amount, v_fee, p_amount - v_fee, upper(p_asset), trim(p_network), p_destination, p_idempotency_key)
  returning * into v_row;

  perform public.apply_ledger(v_uid, 'withdrawal_hold', p_amount, -p_amount, p_amount, 0,
    'withdrawal', v_row.id, 'Funds held for withdrawal ' || v_row.reference);
  perform public.log_audit('withdrawal.requested', 'withdrawal_request', v_row.id::text,
    jsonb_build_object('reference', v_row.reference, 'amount', p_amount, 'fee', v_fee, 'asset', v_row.asset_symbol));
  perform public.notify_user(v_uid, 'withdrawal', 'withdrawalRequested', jsonb_build_object('reference', v_row.reference), 'Withdrawal request received',
    'Withdrawal ' || v_row.reference || ' is pending review. The amount is held until it is completed or rejected.',
    '/dashboard/withdrawals');
  return v_row;
end;
$$;

create or replace function public.cancel_withdrawal(p_id uuid)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_active_user();
  v_row public.withdrawal_requests;
begin
  perform public.lock_balance(v_uid);
  select * into v_row from public.withdrawal_requests where id = p_id and user_id = v_uid for update;
  if not found then perform public.app_error('not_found'); end if;
  if v_row.status <> 'pending' then perform public.app_error('invalid_status'); end if;

  update public.withdrawal_requests set status = 'cancelled' where id = p_id returning * into v_row;
  perform public.apply_ledger(v_uid, 'withdrawal_release', v_row.amount, v_row.amount, -v_row.amount, 0,
    'withdrawal', v_row.id, 'Withdrawal ' || v_row.reference || ' cancelled; funds released');
  perform public.log_audit('withdrawal.cancelled', 'withdrawal_request', v_row.id::text,
    jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

-- =============================================================================
-- Investments
-- Open: available -> invested. Cancel (within 24h): invested -> available.
-- Maturity: invested -> available (principal only — no profit is ever credited
-- automatically; see README "Returns").
-- =============================================================================
create or replace function public.create_investment(p_plan_id uuid, p_amount numeric, p_idempotency_key uuid)
returns public.investments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.require_active_user();
  v_plan public.investment_plans;
  v_bal  public.balances;
  v_row  public.investments;
begin
  if p_idempotency_key is null then perform public.app_error('invalid_request'); end if;
  select * into v_row from public.investments where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  perform public.validate_amount(p_amount);
  select * into v_plan from public.investment_plans where id = p_plan_id and is_active;
  if not found then perform public.app_error('plan_invalid'); end if;
  if p_amount < v_plan.min_amount then perform public.app_error('amount_below_min'); end if;
  if p_amount > v_plan.max_amount then perform public.app_error('amount_above_max'); end if;

  v_bal := public.lock_balance(v_uid);
  select * into v_row from public.investments where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;
  if v_bal.available < p_amount then perform public.app_error('insufficient_funds'); end if;

  insert into public.investments (user_id, plan_id, plan_name, term_days, amount, currency, matures_at, idempotency_key)
  values (v_uid, v_plan.id, v_plan.name, v_plan.term_days, p_amount, v_plan.currency,
          now() + make_interval(days => v_plan.term_days), p_idempotency_key)
  returning * into v_row;

  perform public.apply_ledger(v_uid, 'investment_open', p_amount, -p_amount, 0, p_amount,
    'investment', v_row.id, v_plan.name || ' position ' || v_row.reference || ' opened');
  perform public.log_audit('investment.created', 'investment', v_row.id::text,
    jsonb_build_object('reference', v_row.reference, 'plan', v_plan.slug, 'amount', p_amount));
  perform public.notify_user(v_uid, 'investment', 'investmentOpened', jsonb_build_object('reference', v_row.reference, 'plan', v_plan.name, 'date', to_char(v_row.matures_at, 'YYYY-MM-DD')), 'Position opened',
    v_plan.name || ' position ' || v_row.reference || ' is active and matures on ' || to_char(v_row.matures_at, 'YYYY-MM-DD') || '.',
    '/dashboard/investments');
  return v_row;
end;
$$;

create or replace function public.cancel_investment(p_id uuid)
returns public.investments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_active_user();
  v_row public.investments;
begin
  perform public.lock_balance(v_uid);
  select * into v_row from public.investments where id = p_id and user_id = v_uid for update;
  if not found then perform public.app_error('not_found'); end if;
  if v_row.status <> 'active' then perform public.app_error('invalid_status'); end if;
  if v_row.started_at < now() - interval '24 hours' then perform public.app_error('cancel_window_closed'); end if;

  update public.investments set status = 'cancelled', cancelled_at = now() where id = p_id returning * into v_row;
  perform public.apply_ledger(v_uid, 'investment_cancel', v_row.amount, v_row.amount, 0, -v_row.amount,
    'investment', v_row.id, 'Position ' || v_row.reference || ' cancelled; principal returned');
  perform public.log_audit('investment.cancelled', 'investment', v_row.id::text, jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

-- Internal: mature one locked, due position.
create or replace function public.mature_investment_row(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.investments;
begin
  select * into v_row from public.investments
   where id = p_id and status = 'active' and matures_at <= now()
   for update skip locked;
  if not found then return false; end if;

  perform public.lock_balance(v_row.user_id);
  update public.investments set status = 'matured', matured_at = now() where id = v_row.id;
  perform public.apply_ledger(v_row.user_id, 'investment_maturity', v_row.amount, v_row.amount, 0, -v_row.amount,
    'investment', v_row.id, 'Position ' || v_row.reference || ' matured; principal returned to available balance');
  perform public.notify_user(v_row.user_id, 'investment', 'investmentMatured', jsonb_build_object('reference', v_row.reference), 'Position matured',
    'Position ' || v_row.reference || ' reached the end of its term. The principal is back in your available balance.',
    '/dashboard/investments');
  insert into public.audit_logs (actor_id, actor_roles, action, entity_type, entity_id, details)
  values (auth.uid(), public.current_roles(), 'investment.matured', 'investment', v_row.id::text,
          jsonb_build_object('reference', v_row.reference, 'amount', v_row.amount));
  return true;
end;
$$;

-- Users settle their own due positions (called when the dashboard loads), so
-- maturity never depends on a scheduler being configured.
create or replace function public.mature_my_investments()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int := 0;
  r record;
begin
  if v_uid is null then perform public.app_error('unauthorized'); end if;
  for r in select id from public.investments
            where user_id = v_uid and status = 'active' and matures_at <= now()
            order by matures_at limit 100
  loop
    if public.mature_investment_row(r.id) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

-- Batch maturity for pg_cron / the service role / finance staff.
create or replace function public.process_matured_investments(p_limit int default 500)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
  r record;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not (auth.uid() is null and session_user in ('postgres', 'supabase_admin')) then
    perform public.require_role(array['owner','admin','finance']);
  end if;
  for r in select id from public.investments
            where status = 'active' and matures_at <= now()
            order by matures_at limit greatest(1, least(p_limit, 5000))
  loop
    if public.mature_investment_row(r.id) then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

-- =============================================================================
-- Support
-- =============================================================================
create or replace function public.create_support_ticket(p_subject text, p_category text, p_message text)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.support_tickets;
begin
  if v_uid is null then perform public.app_error('unauthorized'); end if;
  if char_length(trim(coalesce(p_message, ''))) not between 10 and 4000 then perform public.app_error('message_invalid'); end if;
  if (select count(*) from public.support_tickets where user_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
    perform public.app_error('rate_limited');
  end if;
  insert into public.support_tickets (user_id, subject, category)
  values (v_uid, trim(p_subject), p_category) returning * into v_row;
  insert into public.support_messages (ticket_id, author_id, is_staff, body) values (v_row.id, v_uid, false, trim(p_message));
  perform public.log_audit('support.ticket_created', 'support_ticket', v_row.id::text, jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

create or replace function public.reply_to_ticket(p_ticket uuid, p_message text)
returns public.support_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket public.support_tickets;
  v_staff boolean;
  v_msg public.support_messages;
begin
  if v_uid is null then perform public.app_error('unauthorized'); end if;
  if char_length(trim(coalesce(p_message, ''))) not between 1 and 4000 then perform public.app_error('message_invalid'); end if;
  select * into v_ticket from public.support_tickets where id = p_ticket for update;
  if not found then perform public.app_error('not_found'); end if;

  v_staff := v_ticket.user_id <> v_uid;
  if v_staff then
    perform public.require_role(array['owner','admin','support']);
  elsif v_ticket.status = 'closed' then
    perform public.app_error('ticket_closed');
  end if;

  insert into public.support_messages (ticket_id, author_id, is_staff, body)
  values (p_ticket, v_uid, v_staff, trim(p_message)) returning * into v_msg;
  update public.support_tickets
     set status = case when v_staff then 'answered' else 'open' end,
         last_message_at = now(),
         assigned_to = case when v_staff then coalesce(assigned_to, v_uid) else assigned_to end
   where id = p_ticket;

  if v_staff then
    perform public.notify_user(v_ticket.user_id, 'support', 'supportReply', jsonb_build_object('reference', v_ticket.reference), 'New reply on ' || v_ticket.reference,
      'Our support team replied to "' || left(v_ticket.subject, 80) || '".', '/dashboard/support/' || v_ticket.id::text);
    perform public.log_audit('support.staff_reply', 'support_ticket', p_ticket::text, jsonb_build_object('reference', v_ticket.reference));
  end if;
  return v_msg;
end;
$$;

create or replace function public.close_ticket(p_ticket uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then perform public.app_error('unauthorized'); end if;
  select user_id into v_owner from public.support_tickets where id = p_ticket;
  if v_owner is null then perform public.app_error('not_found'); end if;
  if v_owner <> v_uid then perform public.require_role(array['owner','admin','support']); end if;
  update public.support_tickets set status = 'closed' where id = p_ticket;
  perform public.log_audit('support.ticket_closed', 'support_ticket', p_ticket::text, '{}'::jsonb);
end;
$$;

-- =============================================================================
-- Notifications, newsletter, rate limiting
-- =============================================================================
create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

create or replace function public.subscribe_newsletter(p_email text, p_locale text, p_consent_text text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing public.newsletter_subscriptions;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or char_length(v_email) > 254 then
    perform public.app_error('email_invalid');
  end if;
  if coalesce(trim(p_consent_text), '') = '' then perform public.app_error('consent_required'); end if;
  select * into v_existing from public.newsletter_subscriptions where email = v_email;
  if found then
    if v_existing.unsubscribed_at is null then return 'already'; end if;
    update public.newsletter_subscriptions
       set unsubscribed_at = null, consented_at = now(), consent_text = p_consent_text,
           locale = coalesce(p_locale, 'en')
     where id = v_existing.id;
    return 'resubscribed';
  end if;
  insert into public.newsletter_subscriptions (email, locale, consent_text)
  values (v_email, coalesce(nullif(p_locale, ''), 'en'), p_consent_text);
  return 'subscribed';
end;
$$;

create or replace function public.unsubscribe_newsletter(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with u as (
    update public.newsletter_subscriptions set unsubscribed_at = coalesce(unsubscribed_at, now())
     where unsubscribe_token = p_token returning 1
  ) select exists (select 1 from u);
$$;

-- Fixed-window limiter backing lib/security/rate-limit.js (service role only).
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- =============================================================================
-- Function privileges
-- =============================================================================
revoke execute on function public.setting_num(text, numeric) from public, anon, authenticated;
revoke execute on function public.setting_bool(text, boolean) from public, anon, authenticated;
revoke execute on function public.require_active_user() from public, anon, authenticated;
revoke execute on function public.validate_amount(numeric) from public, anon, authenticated;
revoke execute on function public.apply_ledger(uuid, text, numeric, numeric, numeric, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.lock_balance(uuid) from public, anon, authenticated;
revoke execute on function public.mature_investment_row(uuid) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.request_deposit(numeric, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.attach_deposit_receipt(uuid, text) from public, anon, authenticated;
revoke execute on function public.withdrawal_fee(numeric) from public, anon, authenticated;
revoke execute on function public.request_withdrawal(numeric, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_withdrawal(uuid) from public, anon, authenticated;
revoke execute on function public.create_investment(uuid, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_investment(uuid) from public, anon, authenticated;
revoke execute on function public.mature_my_investments() from public, anon, authenticated;
revoke execute on function public.process_matured_investments(int) from public, anon, authenticated;
revoke execute on function public.create_support_ticket(text, text, text) from public, anon, authenticated;
revoke execute on function public.reply_to_ticket(uuid, text) from public, anon, authenticated;
revoke execute on function public.close_ticket(uuid) from public, anon, authenticated;
revoke execute on function public.mark_all_notifications_read() from public, anon, authenticated;
revoke execute on function public.subscribe_newsletter(text, text, text) from public, anon, authenticated;
revoke execute on function public.unsubscribe_newsletter(uuid) from public, anon, authenticated;

grant execute on function public.request_deposit(numeric, text, text, text, text, uuid) to authenticated;
grant execute on function public.attach_deposit_receipt(uuid, text) to authenticated;
grant execute on function public.withdrawal_fee(numeric) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text, text, uuid) to authenticated;
grant execute on function public.cancel_withdrawal(uuid) to authenticated;
grant execute on function public.create_investment(uuid, numeric, uuid) to authenticated;
grant execute on function public.cancel_investment(uuid) to authenticated;
grant execute on function public.mature_my_investments() to authenticated;
grant execute on function public.process_matured_investments(int) to authenticated, service_role;
grant execute on function public.create_support_ticket(text, text, text) to authenticated;
grant execute on function public.reply_to_ticket(uuid, text) to authenticated;
grant execute on function public.close_ticket(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.subscribe_newsletter(text, text, text) to anon, authenticated;
grant execute on function public.unsubscribe_newsletter(uuid) to anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;


-- ============================================================
-- supabase/migrations/20261013000005_staff_operations.sql
-- ============================================================
-- =============================================================================
-- 0005 · Staff operations
-- Every function: require_role (signed in + role + MFA when enrolled),
-- validates the state transition, refuses self-review, writes an audit entry.
-- There is deliberately NO function that edits a balance directly.
-- =============================================================================

-- Deposits --------------------------------------------------------------------------
-- approve: reviewer confirms funds were received -> balance credited -> completed
-- reject:  nothing is credited
create or replace function public.review_deposit(
  p_id uuid, p_decision text, p_note text default null, p_credited_amount numeric default null
)
returns public.deposit_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.deposit_requests;
  v_credit numeric;
begin
  perform public.require_role(array['owner','admin','finance']);
  select * into v_row from public.deposit_requests where id = p_id for update;
  if not found then perform public.app_error('not_found'); end if;
  if v_row.user_id = auth.uid() then perform public.app_error('self_review_forbidden'); end if;
  if v_row.status <> 'pending' then perform public.app_error('invalid_status'); end if;

  if p_decision = 'approve' then
    -- The credited amount is what actually arrived; it can't exceed the request.
    v_credit := coalesce(p_credited_amount, v_row.amount);
    perform public.validate_amount(v_credit);
    if v_credit > v_row.amount then perform public.app_error('credit_exceeds_request'); end if;

    perform public.lock_balance(v_row.user_id);
    update public.deposit_requests
       set status = 'completed', credited_amount = v_credit, reviewed_by = auth.uid(),
           review_note = nullif(trim(p_note), ''), reviewed_at = now(), completed_at = now()
     where id = p_id returning * into v_row;
    perform public.apply_ledger(v_row.user_id, 'deposit', v_credit, v_credit, 0, 0,
      'deposit', v_row.id, 'Deposit ' || v_row.reference || ' confirmed');
    perform public.notify_user(v_row.user_id, 'deposit', 'depositCompleted',
      jsonb_build_object('reference', v_row.reference, 'amount', v_credit),
      'Deposit confirmed', 'Deposit ' || v_row.reference || ' was confirmed and credited to your available balance.',
      '/dashboard/deposits');
  elsif p_decision = 'reject' then
    if coalesce(trim(p_note), '') = '' then perform public.app_error('reason_required'); end if;
    update public.deposit_requests
       set status = 'rejected', reviewed_by = auth.uid(), review_note = trim(p_note), reviewed_at = now()
     where id = p_id returning * into v_row;
    perform public.notify_user(v_row.user_id, 'deposit', 'depositRejected',
      jsonb_build_object('reference', v_row.reference),
      'Deposit not confirmed', 'Deposit ' || v_row.reference || ' could not be confirmed. Open a support ticket if you have questions.',
      '/dashboard/deposits');
  else
    perform public.app_error('invalid_decision');
  end if;

  perform public.log_audit('deposit.' || p_decision, 'deposit_request', v_row.id::text,
    jsonb_build_object('reference', v_row.reference, 'amount', v_row.amount, 'credited', v_row.credited_amount, 'note', p_note));
  return v_row;
end;
$$;

-- Withdrawals -------------------------------------------------------------------------
-- pending    -> processing | approved | rejected
-- processing -> approved | rejected
-- approved   -> completed (payout reference required) | rejected
-- rejected releases held funds; completed pays them out.
create or replace function public.review_withdrawal(
  p_id uuid, p_decision text, p_note text default null, p_payout_reference text default null
)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.withdrawal_requests;
  v_from text;
begin
  perform public.require_role(array['owner','admin','finance']);
  select * into v_row from public.withdrawal_requests where id = p_id for update;
  if not found then perform public.app_error('not_found'); end if;
  if v_row.user_id = auth.uid() then perform public.app_error('self_review_forbidden'); end if;
  v_from := v_row.status;

  if p_decision = 'processing' and v_from = 'pending' then
    update public.withdrawal_requests set status = 'processing', reviewed_by = auth.uid(), reviewed_at = now()
     where id = p_id returning * into v_row;

  elsif p_decision = 'approve' and v_from in ('pending','processing') then
    update public.withdrawal_requests
       set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
     where id = p_id returning * into v_row;
    perform public.notify_user(v_row.user_id, 'withdrawal', 'withdrawalApproved',
      jsonb_build_object('reference', v_row.reference),
      'Withdrawal approved', 'Withdrawal ' || v_row.reference || ' was approved and is waiting for payout confirmation.',
      '/dashboard/withdrawals');

  elsif p_decision = 'complete' and v_from = 'approved' then
    if coalesce(trim(p_payout_reference), '') = '' then perform public.app_error('payout_reference_required'); end if;
    perform public.lock_balance(v_row.user_id);
    update public.withdrawal_requests
       set status = 'completed', completed_by = auth.uid(), completed_at = now(), payout_reference = trim(p_payout_reference)
     where id = p_id returning * into v_row;
    perform public.apply_ledger(v_row.user_id, 'withdrawal_payout', v_row.amount, 0, -v_row.amount, 0,
      'withdrawal', v_row.id, 'Withdrawal ' || v_row.reference || ' paid out');
    perform public.notify_user(v_row.user_id, 'withdrawal', 'withdrawalCompleted',
      jsonb_build_object('reference', v_row.reference, 'amount', v_row.net_amount),
      'Withdrawal completed', 'Withdrawal ' || v_row.reference || ' was paid out.', '/dashboard/withdrawals');

  elsif p_decision = 'reject' and v_from in ('pending','processing','approved') then
    if coalesce(trim(p_note), '') = '' then perform public.app_error('reason_required'); end if;
    perform public.lock_balance(v_row.user_id);
    update public.withdrawal_requests
       set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = trim(p_note)
     where id = p_id returning * into v_row;
    perform public.apply_ledger(v_row.user_id, 'withdrawal_release', v_row.amount, v_row.amount, -v_row.amount, 0,
      'withdrawal', v_row.id, 'Withdrawal ' || v_row.reference || ' rejected; funds released');
    perform public.notify_user(v_row.user_id, 'withdrawal', 'withdrawalRejected',
      jsonb_build_object('reference', v_row.reference),
      'Withdrawal rejected', 'Withdrawal ' || v_row.reference || ' was rejected and the funds returned to your available balance.',
      '/dashboard/withdrawals');
  else
    perform public.app_error('invalid_status');
  end if;

  perform public.log_audit('withdrawal.' || p_decision, 'withdrawal_request', v_row.id::text,
    jsonb_build_object('reference', v_row.reference, 'from', v_from, 'to', v_row.status,
                       'amount', v_row.amount, 'note', p_note, 'payout_reference', p_payout_reference));
  return v_row;
end;
$$;

-- Users ----------------------------------------------------------------------------------
create or replace function public.set_user_status(p_user uuid, p_status text, p_reason text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.profiles;
begin
  perform public.require_role(array['owner','admin']);
  if p_status not in ('active','suspended') then perform public.app_error('invalid_request'); end if;
  if p_user = auth.uid() then perform public.app_error('self_action_forbidden'); end if;
  if coalesce(char_length(trim(p_reason)), 0) < 4 then perform public.app_error('reason_required'); end if;
  if exists (select 1 from public.user_roles where user_id = p_user and role = 'owner')
     and not public.has_any_role(array['owner']) then
    perform public.app_error('forbidden');
  end if;
  update public.profiles set status = p_status, status_reason = trim(p_reason) where id = p_user returning * into v_row;
  if not found then perform public.app_error('not_found'); end if;
  perform public.log_audit('user.' || p_status, 'profile', p_user::text, jsonb_build_object('reason', p_reason));
  perform public.notify_user(p_user, 'account', case when p_status = 'suspended' then 'accountSuspended' else 'accountReactivated' end,
    '{}'::jsonb,
    case when p_status = 'suspended' then 'Account suspended' else 'Account reactivated' end,
    case when p_status = 'suspended' then 'Your account has been suspended. Contact support for details.'
         else 'Your account is active again.' end, '/dashboard');
  return v_row;
end;
$$;

-- Roles: owners manage every role; admins may grant or revoke finance and support.
-- Nobody changes their own roles; the last owner can't be removed.
create or replace function public.set_user_role(p_user uuid, p_role text, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_role(array['owner','admin']);
  if p_role not in ('owner','admin','finance','support') or p_action not in ('grant','revoke') then
    perform public.app_error('invalid_request');
  end if;
  if p_user = auth.uid() then perform public.app_error('self_action_forbidden'); end if;
  if p_role in ('owner','admin') and not public.has_any_role(array['owner']) then
    perform public.app_error('forbidden');
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then perform public.app_error('not_found'); end if;

  if p_action = 'grant' then
    insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, auth.uid())
    on conflict do nothing;
  else
    if p_role = 'owner' and (select count(*) from public.user_roles where role = 'owner') <= 1 then
      perform public.app_error('last_owner');
    end if;
    delete from public.user_roles where user_id = p_user and role = p_role;
  end if;
  perform public.log_audit('role.' || p_action, 'profile', p_user::text, jsonb_build_object('role', p_role));
end;
$$;

-- Plans ---------------------------------------------------------------------------------
create or replace function public.upsert_plan(p_plan jsonb)
returns public.investment_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.investment_plans;
  v_id uuid := nullif(p_plan ->> 'id', '')::uuid;
begin
  perform public.require_role(array['owner','admin']);
  if v_id is null then
    insert into public.investment_plans (
      slug, name, description, min_amount, max_amount, currency, term_days, risk_level, risk_description,
      target_return_min, target_return_max, target_return_basis, is_active, sort_order
    ) values (
      p_plan ->> 'slug', p_plan ->> 'name', p_plan ->> 'description',
      (p_plan ->> 'min_amount')::numeric, (p_plan ->> 'max_amount')::numeric, coalesce(p_plan ->> 'currency', 'USD'),
      (p_plan ->> 'term_days')::int, p_plan ->> 'risk_level', p_plan ->> 'risk_description',
      nullif(p_plan ->> 'target_return_min', '')::numeric, nullif(p_plan ->> 'target_return_max', '')::numeric,
      nullif(p_plan ->> 'target_return_basis', ''), coalesce((p_plan ->> 'is_active')::boolean, true),
      coalesce((p_plan ->> 'sort_order')::int, 0)
    ) returning * into v_row;
  else
    -- Changes apply to new positions only; open positions keep their snapshot.
    update public.investment_plans set
      slug = p_plan ->> 'slug', name = p_plan ->> 'name', description = p_plan ->> 'description',
      min_amount = (p_plan ->> 'min_amount')::numeric, max_amount = (p_plan ->> 'max_amount')::numeric,
      currency = coalesce(p_plan ->> 'currency', currency), term_days = (p_plan ->> 'term_days')::int,
      risk_level = p_plan ->> 'risk_level', risk_description = p_plan ->> 'risk_description',
      target_return_min = nullif(p_plan ->> 'target_return_min', '')::numeric,
      target_return_max = nullif(p_plan ->> 'target_return_max', '')::numeric,
      target_return_basis = nullif(p_plan ->> 'target_return_basis', ''),
      is_active = coalesce((p_plan ->> 'is_active')::boolean, is_active),
      sort_order = coalesce((p_plan ->> 'sort_order')::int, sort_order)
    where id = v_id returning * into v_row;
    if not found then perform public.app_error('not_found'); end if;
  end if;
  perform public.log_audit(case when v_id is null then 'plan.created' else 'plan.updated' end,
    'investment_plan', v_row.id::text, p_plan);
  return v_row;
exception
  when unique_violation then perform public.app_error('slug_taken');
  when check_violation then perform public.app_error('plan_invalid');
end;
$$;

-- Assets ---------------------------------------------------------------------------------
create or replace function public.set_asset_flags(p_symbol text, p_active boolean, p_deposits boolean, p_withdrawals boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_role(array['owner','admin']);
  update public.supported_assets
     set is_active = p_active, accepts_deposits = p_deposits, accepts_withdrawals = p_withdrawals
   where symbol = upper(p_symbol);
  if not found then perform public.app_error('not_found'); end if;
  perform public.log_audit('asset.updated', 'supported_asset', upper(p_symbol),
    jsonb_build_object('active', p_active, 'deposits', p_deposits, 'withdrawals', p_withdrawals));
end;
$$;

-- Announcements ---------------------------------------------------------------------------
create or replace function public.send_announcement(p_title text, p_body text, p_user uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_count int;
begin
  perform public.require_role(array['owner','admin','support']);
  if char_length(trim(coalesce(p_title, ''))) not between 4 and 120
     or char_length(trim(coalesce(p_body, ''))) not between 10 and 2000 then
    perform public.app_error('invalid_request');
  end if;
  insert into public.notifications (user_id, type, title, body)
  select p.id, 'announcement', trim(p_title), trim(p_body)
    from public.profiles p
   where p.status = 'active' and (p_user is null or p.id = p_user);
  get diagnostics v_count = row_count;
  perform public.log_audit('announcement.sent', 'notification', coalesce(p_user::text, 'all'),
    jsonb_build_object('title', p_title, 'recipients', v_count));
  return v_count;
end;
$$;

-- Settings ---------------------------------------------------------------------------------
create or replace function public.update_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_old jsonb;
begin
  perform public.require_role(array['owner','admin']);
  select value into v_old from public.application_settings where key = p_key for update;
  if not found then perform public.app_error('not_found'); end if;
  if jsonb_typeof(p_value) <> jsonb_typeof(v_old) then perform public.app_error('invalid_request'); end if;
  if jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric < 0 then perform public.app_error('invalid_request'); end if;
  update public.application_settings set value = p_value, updated_by = auth.uid() where key = p_key;
  perform public.log_audit('setting.updated', 'application_setting', p_key, jsonb_build_object('from', v_old, 'to', p_value));
end;
$$;

-- Support ticket management ------------------------------------------------------------------
create or replace function public.set_ticket_status(p_ticket uuid, p_status text, p_priority text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_role(array['owner','admin','support']);
  if p_status not in ('open','answered','closed') then perform public.app_error('invalid_request'); end if;
  if p_priority is not null and p_priority not in ('low','normal','high') then perform public.app_error('invalid_request'); end if;
  update public.support_tickets
     set status = p_status, priority = coalesce(p_priority, priority), assigned_to = coalesce(assigned_to, auth.uid())
   where id = p_ticket;
  if not found then perform public.app_error('not_found'); end if;
  perform public.log_audit('support.status', 'support_ticket', p_ticket::text, jsonb_build_object('status', p_status, 'priority', p_priority));
end;
$$;

-- Dashboard figures, computed from records ----------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_role(array['owner','admin','finance','support']);
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_active_30d', (select count(*) from public.profiles where last_seen_at > now() - interval '30 days'),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_suspended', (select count(*) from public.profiles where status = 'suspended'),
    'deposits_pending', (select count(*) from public.deposit_requests where status = 'pending'),
    'deposits_pending_amount', (select coalesce(sum(amount), 0) from public.deposit_requests where status = 'pending'),
    'withdrawals_open', (select count(*) from public.withdrawal_requests where status in ('pending','processing','approved')),
    'withdrawals_open_amount', (select coalesce(sum(amount), 0) from public.withdrawal_requests where status in ('pending','processing','approved')),
    'investments_active', (select count(*) from public.investments where status = 'active'),
    'investments_active_amount', (select coalesce(sum(amount), 0) from public.investments where status = 'active'),
    'investments_due', (select count(*) from public.investments where status = 'active' and matures_at <= now()),
    'tickets_open', (select count(*) from public.support_tickets where status = 'open'),
    'balances_available', (select coalesce(sum(available), 0) from public.balances),
    'balances_held', (select coalesce(sum(held), 0) from public.balances),
    'balances_invested', (select coalesce(sum(invested), 0) from public.balances)
  );
end;
$$;

-- Daily flow of confirmed deposits and paid-out withdrawals, last N days.
create or replace function public.admin_daily_flows(p_days int default 30)
returns table (day date, deposits numeric, withdrawals numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_role(array['owner','admin','finance']);
  return query
    select d::date,
           coalesce((select sum(t.amount) from public.transactions t
                      where t.type = 'deposit' and t.created_at >= d and t.created_at < d + interval '1 day'), 0),
           coalesce((select sum(t.amount) from public.transactions t
                      where t.type = 'withdrawal_payout' and t.created_at >= d and t.created_at < d + interval '1 day'), 0)
      from generate_series(date_trunc('day', now()) - make_interval(days => greatest(1, least(p_days, 365)) - 1),
                           date_trunc('day', now()), interval '1 day') as d;
end;
$$;

-- Privileges ---------------------------------------------------------------------------------
revoke execute on function public.review_deposit(uuid, text, text, numeric) from public, anon, authenticated;
revoke execute on function public.review_withdrawal(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.set_user_status(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.set_user_role(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.upsert_plan(jsonb) from public, anon, authenticated;
revoke execute on function public.set_asset_flags(text, boolean, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.send_announcement(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.update_setting(text, jsonb) from public, anon, authenticated;
revoke execute on function public.set_ticket_status(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_overview() from public, anon, authenticated;
revoke execute on function public.admin_daily_flows(int) from public, anon, authenticated;

grant execute on function public.review_deposit(uuid, text, text, numeric) to authenticated;
grant execute on function public.review_withdrawal(uuid, text, text, text) to authenticated;
grant execute on function public.set_user_status(uuid, text, text) to authenticated;
grant execute on function public.set_user_role(uuid, text, text) to authenticated;
grant execute on function public.upsert_plan(jsonb) to authenticated;
grant execute on function public.set_asset_flags(text, boolean, boolean, boolean) to authenticated;
grant execute on function public.send_announcement(text, text, uuid) to authenticated;
grant execute on function public.update_setting(text, jsonb) to authenticated;
grant execute on function public.set_ticket_status(uuid, text, text) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_daily_flows(int) to authenticated;


-- ============================================================
-- supabase/migrations/20261013000006_storage_realtime_settings.sql
-- ============================================================
-- =============================================================================
-- 0006 · Receipt storage, realtime, default settings
-- =============================================================================

-- Private bucket for deposit receipts: 5 MB, images or PDF only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Users write only inside their own folder: receipts/<user-id>/<file>
create policy "receipts: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "receipts: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "receipts: finance read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (select public.has_any_role(array['owner','admin','finance'])));

-- Realtime: live notification badge. Only notifications are published; RLS
-- still decides which rows each subscriber receives.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- Default settings. Public ones are readable by signed-in users (fees and limits
-- are shown before a request is confirmed).
insert into public.application_settings (key, value, is_public, description) values
  ('deposit_min',            '10'::jsonb,    true,  'Minimum deposit request (USD)'),
  ('deposit_max',            '1000000'::jsonb, true, 'Maximum deposit request (USD)'),
  ('withdrawal_min',         '20'::jsonb,    true,  'Minimum withdrawal (USD)'),
  ('withdrawal_max',         '50000'::jsonb, true,  'Maximum withdrawal per request (USD)'),
  ('withdrawal_fee_flat',    '2'::jsonb,     true,  'Flat withdrawal fee (USD)'),
  ('withdrawal_fee_percent', '0.5'::jsonb,   true,  'Percentage withdrawal fee'),
  ('maintenance_mode',       'false'::jsonb, true,  'Blocks new money operations when true'),
  ('registrations_open',     'true'::jsonb,  true,  'Allows new sign-ups when true')
on conflict (key) do nothing;


-- ============================================================
-- supabase/seed.sql
-- ============================================================
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

