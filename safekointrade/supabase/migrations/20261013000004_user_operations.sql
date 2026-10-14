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
