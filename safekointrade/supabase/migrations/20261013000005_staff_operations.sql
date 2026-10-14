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
