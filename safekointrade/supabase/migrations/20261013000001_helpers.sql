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
