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
