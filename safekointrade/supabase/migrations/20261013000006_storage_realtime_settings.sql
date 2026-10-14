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
