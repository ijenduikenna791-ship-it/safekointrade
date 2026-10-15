-- Languages: drop Yoruba, add Italian, Russian, Japanese and Hindi.
-- Existing Yoruba profiles fall back to English.

update public.profiles set locale = 'en' where locale not in ('en','fr','es','pt','de','it','ru','ar','zh','ja','hi');

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles
  add constraint profiles_locale_check check (locale in ('en','fr','es','pt','de','it','ru','ar','zh','ja','hi'));

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
    case when meta ->> 'locale' in ('en','fr','es','pt','de','it','ru','ar','zh','ja','hi') then meta ->> 'locale' else 'en' end,
    case when (meta ->> 'terms_accepted')::boolean is true then now() end
  );
  insert into public.balances (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;
