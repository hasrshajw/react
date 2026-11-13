-- Schedy database schema for Supabase. Run in: Supabase dashboard > SQL Editor.
--
-- This file is SAFE TO RE-RUN: it never deletes tables or data (tables use "if not exists"; functions, policies and
-- triggers are replaced). It already includes everything from supabase/migrations/001, 003, 007, 008 and 009, so a NEW project only
-- needs this file, then supabase/seed.sql (optional starter templates).
-- (Migration 002 only cleans old template rows; seed.sql is already clean, so a new project does not need it.)
--
-- To wipe everything and start over, run supabase/reset.sql first. That is a separate file on purpose.
--
-- Existing project that already has data: re-running this file is fine, but if the "slug rules" step below fails with
-- "violates check constraint", fix the rows listed by this query first (it must return no rows), then run again:
--   select id, slug from public.invitations
--   where not (lower(slug) ~ '^[a-z0-9_-]{3,30}$' or slug = id)
--      or lower(slug) = any (array[
--        'login','invitations','templates','create','inventory','billing','customize',
--        'dashboard','api','assets','i','admin','privacy','terms','pricing','about','contact',
--        'favicon','robots','sitemap']);

-- ---------- 1. tables ----------
create table if not exists public.categories (
  id text primary key,
  name text not null
);

create table if not exists public.templates (
  id text primary key,
  category_id text references public.categories(id),
  name text not null,
  html_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id text primary key,
  slug text not null,                       -- the link ID: /i/<slug>
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  groom_name text,
  bride_name text,
  event_date date,
  template_id text,
  template_name text,
  details jsonb not null default '{}'::jsonb, -- the whole form (names, venue, events, photos...)
  views integer not null default 0,
  published boolean not null default true,
  deleted_at timestamptz,                    -- set = in the trash
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one invitation per link ID, ignoring upper/lower case
create unique index if not exists invitations_slug_key on public.invitations (lower(slug));
create index if not exists invitations_owner_idx on public.invitations (owner, created_at desc);

-- keeps updated_at current, but a view-count change alone is not an edit (task H-4)
create or replace function public.invitations_touch() returns trigger language plpgsql as $$
begin
  if new.views is distinct from old.views
     and (to_jsonb(new) - 'views' - 'updated_at') = (to_jsonb(old) - 'views' - 'updated_at') then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists invitations_touch on public.invitations;
create trigger invitations_touch before update on public.invitations
  for each row execute function public.invitations_touch();

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  message text,
  status text not null default 'new' check (status in ('new','followup','called','cancelled')),
  note text not null default '',
  follow_up_date date,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text default 'Administrator',
  plan_name text default 'Pro',
  plan_status text default 'trial' check (plan_status in ('trial','active','past_due')),
  trial_ends_at timestamptz default (now() + interval '14 days')
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- trash: server time and scheduled purge (was migration 009, task L-8) ----------
-- The trash date is stamped by the server for API callers; the SQL Editor may set any value. expired_trash_ids() is what the
-- Dashboard asks, purge_expired_trash() is the daily job (pg_cron, if available). Details: supabase/migrations/009_trash_server_time.sql.
create or replace function public.trash_retention() returns interval language sql stable as $$
  select interval '30 days'
$$;

create or replace function public.invitations_trash_stamp() returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.deleted_at is not null then new.deleted_at := now(); end if;
    elsif new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
      new.deleted_at := coalesce(old.deleted_at, now());
    end if;
  end if;
  return new;
end $$;

drop trigger if exists invitations_trash_stamp on public.invitations;
create trigger invitations_trash_stamp before insert or update on public.invitations
  for each row execute function public.invitations_trash_stamp();

-- the caller's own expired invitations (row level security limits it to their rows)
create or replace function public.expired_trash_ids() returns setof text
  language sql stable set search_path = public as $$
  select id from public.invitations where deleted_at is not null and deleted_at < now() - public.trash_retention()
$$;
revoke all on function public.expired_trash_ids() from public, anon;
grant execute on function public.expired_trash_ids() to authenticated;

-- deletes every expired invitation (all owners); for the scheduled job only
create or replace function public.purge_expired_trash() returns integer
  language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.invitations where deleted_at is not null and deleted_at < now() - public.trash_retention();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_expired_trash() from public, anon, authenticated;

-- schedule it every day at 03:17 UTC (needs the pg_cron extension)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-expired-trash', '17 3 * * *', 'select public.purge_expired_trash()');
  else
    raise notice 'pg_cron is not available: the trash purge is NOT scheduled. Enable it (Database > Extensions) and run this file again.';
  end if;
exception when others then
  raise notice 'Could not schedule the trash purge (%). Enable pg_cron (Database > Extensions) and run this file again.', sqlerrm;
end $$;

-- ---------- admin role (C-1) ----------
-- Who is an administrator lives in this table, not in the browser. Nobody can read or write it through the API
-- (RLS on, no policies, no grants); only is_admin() reads it. Add the first admin by hand (see README, step 3):
--   insert into public.admins (user_id, email) select id, email from auth.users where lower(email) = lower('you@example.com');
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- row level security ----------
alter table public.categories  enable row level security;
alter table public.templates   enable row level security;
alter table public.invitations enable row level security;
alter table public.enquiries   enable row level security;
alter table public.profiles    enable row level security;

-- Templates and categories: admins only (a signed-in stranger can no longer edit the HTML that every invitation runs).
drop policy if exists "categories: signed-in all" on public.categories;
drop policy if exists "categories: admin all" on public.categories;
create policy "categories: admin all" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "templates: signed-in all" on public.templates;
drop policy if exists "templates: admin all" on public.templates;
create policy "templates: admin all" on public.templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invitations: owner all" on public.invitations;
create policy "invitations: owner all" on public.invitations for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Enquiries: anyone (the public website form) may add one; only admins may read or change them.
-- (the public insert policy and its column grants are defined in the "enquiry insert hardening" section below)
drop policy if exists "enquiries: admin read" on public.enquiries;
create policy "enquiries: admin read" on public.enquiries for select to authenticated using (public.is_admin());
drop policy if exists "enquiries: admin update" on public.enquiries;
create policy "enquiries: admin update" on public.enquiries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles (C-3): a user may read their own row and change only their display name. plan_*, role and
-- trial_ends_at can no longer be set from the browser (they are changed in the dashboard or by a future billing job).
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

-- ---------- public invitation page ----------
-- Customers are not signed in, so they cannot read the table. get_public_invitation() hands out exactly one
-- published, non-deleted invitation (plus its template HTML) for a link ID. Counting is separate, see below.
-- reads one published invitation and does NOT count the view (record_invitation_view does, task H-4)
create or replace function public.get_public_invitation(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.invitations; t public.templates;
begin
  select * into r from public.invitations
   where lower(slug) = lower(p_slug) and published and deleted_at is null limit 1;
  if not found then return null; end if;
  select * into t from public.templates where id = coalesce(r.template_id, r.details->>'templateId');
  return jsonb_build_object(
    'groom_name', r.groom_name, 'bride_name', r.bride_name,
    'details', r.details, 'html_code', t.html_code);
end $$;
revoke all on function public.get_public_invitation(text) from public;
grant execute on function public.get_public_invitation(text) to anon, authenticated;

-- bookkeeping tables (not readable or writable through the API; only the function below touches them)
create table if not exists public.invitation_view_seen (
  invitation_id text not null references public.invitations(id) on delete cascade,
  visitor text not null,
  day date not null default (now() at time zone 'utc')::date,
  primary key (invitation_id, visitor, day)
);
create table if not exists public.invitation_view_rate (
  invitation_id text not null references public.invitations(id) on delete cascade,
  minute timestamptz not null,
  n integer not null default 0,
  primary key (invitation_id, minute)
);
alter table public.invitation_view_seen enable row level security;
alter table public.invitation_view_rate enable row level security;
revoke all on public.invitation_view_seen from anon, authenticated;
revoke all on public.invitation_view_rate from anon, authenticated;

-- the counter. Returns true only when the view was counted.
create or replace function public.record_invitation_view(p_slug text, p_visitor text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r_id text;
  added integer;
  hits integer;
  max_per_minute constant integer := 120;
begin
  if p_visitor is null or p_visitor !~ '^[A-Za-z0-9_-]{16,64}$' then return false; end if;
  select id into r_id from public.invitations
   where lower(slug) = lower(p_slug) and published and deleted_at is null limit 1;
  if r_id is null then return false; end if;

  -- housekeeping for this invitation only (cheap: both tables are keyed by invitation_id first)
  delete from public.invitation_view_seen
   where invitation_id = r_id and day < (now() at time zone 'utc')::date - 1;
  delete from public.invitation_view_rate
   where invitation_id = r_id and minute < now() - interval '1 hour';

  -- once per visitor per day
  insert into public.invitation_view_seen (invitation_id, visitor) values (r_id, p_visitor)
    on conflict do nothing;
  get diagnostics added = row_count;
  if added = 0 then return false; end if;

  -- cap per invitation per minute
  insert into public.invitation_view_rate (invitation_id, minute, n)
    values (r_id, date_trunc('minute', now()), 1)
    on conflict (invitation_id, minute) do update set n = invitation_view_rate.n + 1
    returning n into hits;
  if hits > max_per_minute then return false; end if;

  update public.invitations set views = views + 1 where id = r_id;
  return true;
end $$;
revoke all on function public.record_invitation_view(text, text) from public;
grant execute on function public.record_invitation_view(text, text) to anon, authenticated;


-- ---------- link-preview lookup (was migration 001, part 2) ----------
-- Crawlers (api/invite.js) use this lookup, which never counts a view.
create or replace function public.get_invitation_meta(p_slug text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'groom_name', groom_name, 'bride_name', bride_name, 'event_date', event_date,
    'seo_title', details->>'seoTitle', 'seo_description', details->>'seoDescription',
    'seo_image', details->>'seoImage', 'venue', details->>'venueEn')
  from public.invitations
  where lower(slug) = lower(p_slug) and published and deleted_at is null
  limit 1;
$$;
revoke all on function public.get_invitation_meta(text) from public;
grant execute on function public.get_invitation_meta(text) to anon, authenticated;

-- ---------- link-preview images: storage bucket (was migration 001, part 1) ----------
-- Public bucket; files are stored as <user id>/<invitation id>.jpg, so the first folder must be the signed-in user.
-- M-4: JPEG only, 300 KB at most (the app shrinks every preview image to fit, src/lib/image.ts OG_MAX_BYTES). The limits are
-- re-applied on every run, so an existing bucket gets them too.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-previews', 'invitation-previews', true, 307200, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 307200, allowed_mime_types = array['image/jpeg'];

drop policy if exists "previews: public read"  on storage.objects;
drop policy if exists "previews: owner write"  on storage.objects;
drop policy if exists "previews: owner update" on storage.objects;
drop policy if exists "previews: owner delete" on storage.objects;

create policy "previews: public read" on storage.objects for select
  using (bucket_id = 'invitation-previews');
create policy "previews: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "previews: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "previews: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- slug rules: bad and reserved link names (was migration 001, part 3) ----------
-- Keep the reserved list in sync with src/lib/reserved.ts and vercel.json.
-- The format check ignores case (old links could contain capitals) and allows slug = id, because an invitation
-- without a custom link uses its own id (a 36 character uuid) as the slug.
-- Added only when missing, so re-running this file never fails because the constraint already exists. To change the
-- rules later, drop the constraint by hand (or use a new migration) and add it again.
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.invitations'::regclass and conname = 'invitations_slug_format') then
    alter table public.invitations
      add constraint invitations_slug_format
      check (lower(slug) ~ '^[a-z0-9_-]{3,30}$' or slug = id);
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.invitations'::regclass and conname = 'invitations_slug_reserved') then
    alter table public.invitations
      add constraint invitations_slug_reserved
      check (lower(slug) <> all (array[
        'login','invitations','templates','create','inventory','billing','customize',
        'dashboard','api','assets','i','admin','privacy','terms','pricing','about','contact',
        'favicon','robots','sitemap','my','reviews']));
  end if;
end $$;

-- ---------- invitation details validation (was migration 003, H-2 database half) ----------
-- Same rules as src/lib/compileInvitation.ts (SAFE_PROTOCOLS) and src/lib/validate.ts (limits). Existing rows are not
-- re-checked: the trigger only fires on insert and when `details` changes. To list old rows that would now be rejected:
--   select id, slug, public.details_problem(details) from public.invitations
--   where public.details_problem(details) is not null;

-- URL rule: http, https, tel, mailto; no scheme at all (relative link, #anchor) is fine.
-- Control characters and spaces are stripped before reading the scheme ("java\tscript:" is still "javascript:").
create or replace function public.is_safe_url(v text) returns boolean
language sql immutable as $$
  select case
    when v is null then true
    else coalesce(
      (regexp_match(
         regexp_replace(v, '[\x01-\x20\x7f-\xa0 ᠎ -‍    ⁠　﻿]', '', 'g'),
         '^([A-Za-z][A-Za-z0-9+.-]*):'))[1] ilike any (array['http','https','tel','mailto']),
      true)   -- no scheme at all
  end
$$;

-- Returns NULL when `details` is acceptable, otherwise a short reason. Rules: object, <= 64 KB, every top-level string
-- <= 1000 chars, lists <= 20 items, URL fields use the allow-list, phone fields look like phone numbers (10-13 digits),
-- seoTitle <= 200 and seoDescription <= 400 (hard caps; the UI warns earlier at 60 / 160), seoImage empty or a file of the
-- preview bucket (M-4).
create or replace function public.details_problem(d jsonb) returns text
language plpgsql immutable as $$
declare
  k text; v jsonb; item jsonb; s text;
  text_keys  text[] := array['customId','templateId','surnameEn','surnameTe','weddingDate','muhurthamTime','groomEn','groomTe',
    'groomFatherEn','groomFatherTe','groomFatherPhone','groomMotherEn','groomMotherTe','groomMotherPhone','brideEn','brideTe',
    'brideFatherEn','brideFatherTe','brideFatherPhone','brideMotherEn','brideMotherTe','brideMotherPhone','receptionDate',
    'receptionTime','venueEn','venueTe','venueAddress','venueMaps','seoTitle','seoDescription','seoImage'];
  url_keys   text[] := array['venueMaps','seoImage'];
  phone_keys text[] := array['groomFatherPhone','groomMotherPhone','brideFatherPhone','brideMotherPhone'];
  list_keys  text[] := array['events','groomContacts','brideContacts'];
  sub_text   text[] := array['id','name','nameTe','nameEn','date','time','venue','venueTe','maps','phone'];
begin
  if d is null or jsonb_typeof(d) <> 'object' then return 'details must be a JSON object'; end if;
  if octet_length(d::text) > 65536 then return 'details is larger than 64 KB'; end if;

  for k, v in select * from jsonb_each(d) loop
    if k = any (text_keys) then
      if jsonb_typeof(v) not in ('string','null') then return k || ' must be text'; end if;
      s := v #>> '{}';
      if s is not null then
        if char_length(s) > 1000 then return k || ' is longer than 1000 characters'; end if;
        if k = 'seoTitle' and char_length(s) > 200 then return 'seoTitle is too long'; end if;
        if k = 'seoDescription' and char_length(s) > 400 then return 'seoDescription is too long'; end if;
        if k = any (url_keys) and not public.is_safe_url(s) then return k || ' has a link type that is not allowed'; end if;
        -- M-4: the preview image must be a file from this app's own preview bucket (same shape as src/lib/previewUrl.ts).
        if k = 'seoImage' and btrim(s) <> '' and s !~ '^https://[^/?#[:space:]@]+/storage/v1/object/public/invitation-previews/[^/?#[:space:]]+/[^/?#[:space:]]+\.jpg(\?v=[0-9]+)?$' then
          return 'seoImage must be a preview image uploaded in this app'; end if;
        if k = any (phone_keys) and btrim(s) <> '' and not (
             s ~ '^[+0-9 ()-]+$' and char_length(regexp_replace(s, '\D', '', 'g')) between 10 and 13) then
          return k || ' is not a valid phone number'; end if;
      end if;
    elsif k = 'receptionEnabled' then
      if jsonb_typeof(v) <> 'boolean' then return 'receptionEnabled must be true or false'; end if;
    elsif k = any (list_keys) then
      if jsonb_typeof(v) <> 'array' then return k || ' must be a list'; end if;
      if jsonb_array_length(v) > 20 then return k || ' has more than 20 items'; end if;
      for item in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(item) <> 'object' then return k || ' items must be objects'; end if;
        declare ik text; iv jsonb; is_ text; begin
          for ik, iv in select * from jsonb_each(item) loop
            if ik = any (sub_text) then
              if jsonb_typeof(iv) not in ('string','null') then return k || '.' || ik || ' must be text'; end if;
              is_ := iv #>> '{}';
              if is_ is not null and char_length(is_) > 1000 then return k || '.' || ik || ' is longer than 1000 characters'; end if;
              if ik = 'maps' and not public.is_safe_url(is_) then return k || '.maps has a link type that is not allowed'; end if;
              if ik = 'phone' and btrim(coalesce(is_, '')) <> '' and not (
                   is_ ~ '^[+0-9 ()-]+$' and char_length(regexp_replace(is_, '\D', '', 'g')) between 10 and 13) then
                return k || '.phone is not a valid phone number'; end if;
            end if;
          end loop;
        end;
      end loop;
    end if;
    -- other keys (templateId aliases, UI flags) are left alone; the compiler only reads the keys above.
  end loop;
  return null;
end $$;

create or replace function public.details_is_valid(d jsonb) returns boolean
language sql immutable as $$ select public.details_problem(d) is null $$;

-- Enforced on insert and whenever `details` changes. A trigger (not a CHECK) so legacy rows stay updatable for other
-- columns such as `views`, `published` and `deleted_at`.
create or replace function public.invitations_check_details() returns trigger
language plpgsql as $$
declare p text;
begin
  if tg_op = 'UPDATE' and new.details is not distinct from old.details then return new; end if;
  p := public.details_problem(new.details);
  if p is not null then
    raise exception 'Invalid invitation details: %', p using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists invitations_check_details on public.invitations;
create trigger invitations_check_details before insert or update on public.invitations
  for each row execute function public.invitations_check_details();

-- ---------- enquiry insert hardening (was migration 004, H-5 database half) ----------
-- The public website form inserts enquiries with the anon key, so everything a stranger can write is limited here:
--   1. Column grants: anon and signed-in users may set only name, phone, email and message. note, status,
--      follow_up_date, history, id and created_at always take their defaults (admins change them with UPDATE).
--   2. The insert policy also requires those default values, as a second lock.
--   3. A trigger checks lengths and formats (message <= 2000 characters, name <= 100, phone, email) and refuses a 6th
--      enquiry from the same phone number or email within one hour. It is a trigger, not a CHECK, so old rows stay
--      updatable. The count runs as the table owner (security definer) because anon cannot read the table.
-- Not done here: captcha and a per-IP rate limit. The database does not see the visitor's IP; that needs an Edge
-- Function or Vercel route in front of the insert (see task H-5 in task.md).
-- The public form must not ask for the inserted row back (no `.select()` / `Prefer: return=representation`): anon
-- has no read access, so that request would be refused.
revoke insert on public.enquiries from anon, authenticated;
grant insert (name, phone, email, message) on public.enquiries to anon, authenticated;

drop policy if exists "enquiries: public insert" on public.enquiries;
create policy "enquiries: public insert" on public.enquiries for insert to anon, authenticated
  with check (status = 'new' and note = '' and follow_up_date is null and history = '[]'::jsonb);

create index if not exists enquiries_email_recent_idx on public.enquiries (lower(email), created_at desc);
create index if not exists enquiries_phone_recent_idx on public.enquiries (phone, created_at desc);

create or replace function public.enquiries_check_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare digits text; recent int;
begin
  new.name    := nullif(btrim(coalesce(new.name, '')), '');
  new.phone   := nullif(btrim(coalesce(new.phone, '')), '');
  new.email   := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.message := nullif(btrim(coalesce(new.message, '')), '');

  if char_length(coalesce(new.name, ''))    > 100  then raise exception 'Enquiry name is longer than 100 characters'    using errcode = '23514'; end if;
  if char_length(coalesce(new.message, '')) > 2000 then raise exception 'Enquiry message is longer than 2000 characters' using errcode = '23514'; end if;

  if new.phone is not null then
    digits := regexp_replace(new.phone, '\D', '', 'g');
    if new.phone !~ '^[+0-9 ()-]+$' or char_length(new.phone) > 20 or char_length(digits) not between 10 and 13 then
      raise exception 'Enquiry phone number is not valid' using errcode = '23514';
    end if;
  end if;
  if new.email is not null and (char_length(new.email) > 254 or new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'Enquiry email is not valid' using errcode = '23514';
  end if;

  if new.phone is not null or new.email is not null then
    select count(*) into recent from public.enquiries e
     where e.created_at > now() - interval '1 hour'
       and ((new.phone is not null and e.phone = new.phone) or (new.email is not null and lower(e.email) = new.email));
    if recent >= 5 then
      raise exception 'Too many enquiries from this contact. Please try again later.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enquiries_check_insert on public.enquiries;
create trigger enquiries_check_insert before insert on public.enquiries
  for each row execute function public.enquiries_check_insert();

-- ---------- enquiry status history (was migration 008, task L-7) ----------
-- The database appends {status, at} with the server time when `status` changes and ignores any `history` the client sends.
create or replace function public.enquiries_history() returns trigger language plpgsql as $$
begin
  new.history := coalesce(old.history, '[]'::jsonb);
  if new.status is distinct from old.status then
    new.history := new.history || jsonb_build_array(jsonb_build_object(
      'status', new.status,
      'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end if;
  return new;
end $$;

drop trigger if exists enquiries_history on public.enquiries;
create trigger enquiries_history before update on public.enquiries
  for each row execute function public.enquiries_history();


-- ---------- backfill ----------
-- Users who signed up before this script ran have no profile row (the trigger only fires for new users).
insert into public.profiles (id, name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ---------- Track B (B2): client self-service editing, first part ----------
-- A client is an ordinary login whose VERIFIED email equals invitations.client_email. They never get a policy on
-- `invitations`: they read through my_invitations() (safe columns only) and write only through the RPCs below, which
-- create a pending change request. Nothing a client sends reaches the live invitation (the admin review RPC comes next).

alter table public.invitations add column if not exists client_email text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invitations_client_email_check') then
    alter table public.invitations add constraint invitations_client_email_check check (
      client_email is null or (client_email = lower(btrim(client_email)) and char_length(client_email) <= 254
        and client_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
  end if;
end $$;
create index if not exists invitations_client_email_idx on public.invitations (client_email) where client_email is not null;

-- The signed-in person's email, only when it is verified (D3). Null otherwise.
create or replace function public.current_user_email() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(btrim(email)) from auth.users where id = auth.uid() and email_confirmed_at is not null;
$$;
revoke all on function public.current_user_email() from public, anon;
grant execute on function public.current_user_email() to authenticated;

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  invitation_id text not null references public.invitations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  client_email text not null,
  base_updated_at timestamptz not null,           -- the invitation version the client started from (D7)
  proposed_details jsonb not null,                -- the live details with the client's changes laid over them
  changed_keys text[] not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn','superseded')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  acknowledged_at timestamptz,                    -- the client dismissed a rejection
  created_at timestamptz not null default now(),
  check (octet_length(proposed_details::text) <= 65536)
);
-- D5: one pending request per invitation
create unique index if not exists change_requests_one_pending_idx on public.change_requests (invitation_id) where status = 'pending';
create index if not exists change_requests_user_idx on public.change_requests (requested_by, created_at desc);
alter table public.change_requests enable row level security;
revoke all on public.change_requests from anon, authenticated;
grant select on public.change_requests to authenticated;     -- no insert, update or delete for anybody: only the RPCs write
drop policy if exists "change_requests: own read" on public.change_requests;
create policy "change_requests: own read" on public.change_requests for select to authenticated using (requested_by = auth.uid());
drop policy if exists "change_requests: admin read" on public.change_requests;
create policy "change_requests: admin read" on public.change_requests for select to authenticated using (public.is_admin());

-- Changing the client, trashing, or unpublishing the invitation cancels the pending request (B7).
-- The old client loses access at once because every read goes through current_user_email().
create or replace function public.invitations_supersede_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.client_email is distinct from old.client_email
     or (new.deleted_at is not null and old.deleted_at is null)
     or (new.published is false and old.published is distinct from false) then
    with s as (update public.change_requests set status = 'superseded' where invitation_id = new.id and status = 'pending' returning id, requested_by)
    insert into public.notifications (audience, recipient_user_id, type, invitation_id, request_id)
      select 'user', requested_by, 'change_superseded', new.id, id from s;
  end if;
  return null;
end $$;
drop trigger if exists invitations_supersede_requests on public.invitations;
create trigger invitations_supersede_requests after update on public.invitations
  for each row execute function public.invitations_supersede_requests();

-- Keys a client may change (D6). Never: customId, templateId, seoImage, slug, published, deleted_at, client_email, owner, views.
-- A missing key counts as an empty value, so a form that sends every key does not show false changes.
create or replace function public.details_value(d jsonb, k text) returns jsonb language sql immutable as $$
  select coalesce(nullif(d -> k, 'null'::jsonb),
    case when k in ('events','groomContacts','brideContacts') then '[]'::jsonb
         when k = 'receptionEnabled' then 'false'::jsonb else '""'::jsonb end);
$$;
revoke all on function public.details_value(jsonb, text) from public, anon, authenticated;

-- B7 / M-5: hard cap 500 (under PostgREST's 1,000-row default). Only the caller's linked rows; no views/enquiries/other clients.
create or replace function public.my_invitations() returns table (
  id text, groom_name text, bride_name text, event_date date, template_id text, published boolean, details jsonb,
  updated_at timestamptz, request_id uuid, request_status text, request_admin_note text,
  request_created_at timestamptz, request_acknowledged_at timestamptz, request_proposed_details jsonb)
language sql stable security definer set search_path = public as $$
  select i.id, i.groom_name, i.bride_name, i.event_date, i.template_id, i.published, i.details, i.updated_at,
         r.id, r.status, r.admin_note, r.created_at, r.acknowledged_at, r.proposed_details
  from public.invitations i
  left join lateral (select c.* from public.change_requests c where c.invitation_id = i.id order by c.created_at desc limit 1) r on true
  where i.client_email = public.current_user_email() and i.deleted_at is null
  order by i.created_at desc
  limit 500;
$$;
revoke all on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

create or replace function public.submit_change_request(p_invitation_id text, p_details jsonb, p_base_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['surnameEn','surnameTe','weddingDate','muhurthamTime','groomEn','groomTe','groomFatherEn','groomFatherTe',
    'groomFatherPhone','groomMotherEn','groomMotherTe','groomMotherPhone','brideEn','brideTe','brideFatherEn','brideFatherTe',
    'brideFatherPhone','brideMotherEn','brideMotherTe','brideMotherPhone','receptionEnabled','receptionDate','receptionTime',
    'venueEn','venueTe','venueAddress','venueMaps','events','groomContacts','brideContacts','seoTitle','seoDescription'];
  v_email text := public.current_user_email();
  v_inv public.invitations%rowtype;
  v_changed text[];
  v_changes jsonb;
  v_proposed jsonb;
  v_problem text;
  v_id uuid;
begin
  if auth.uid() is null or v_email is null then
    raise exception 'Sign in with a verified email to submit changes' using errcode = '42501';
  end if;
  -- one message for "not yours", "not found" and "in the trash": nothing about other people's invitations leaks
  select * into v_inv from public.invitations
    where id = p_invitation_id and client_email = v_email and deleted_at is null for update;
  if not found then raise exception 'Invitation not found' using errcode = 'P0002'; end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception 'details must be a JSON object' using errcode = '22023'; end if;
  if p_base_updated_at is null or p_base_updated_at > v_inv.updated_at then
    raise exception 'Invalid base version' using errcode = '22023'; end if;

  select coalesce(array_agg(k order by k), '{}') into v_changed
    from jsonb_object_keys(p_details) k
    where k = any (allowed) and public.details_value(v_inv.details, k) is distinct from public.details_value(p_details, k);
  if cardinality(v_changed) = 0 then raise exception 'No changes to submit' using errcode = '22023'; end if;

  select jsonb_object_agg(k, public.details_value(p_details, k)) into v_changes from unnest(v_changed) k;
  v_proposed := v_inv.details || v_changes;
  v_problem := public.details_problem(v_proposed);   -- the same rules as the editor and the live table (H-2, M-4)
  if v_problem is not null then raise exception 'Invalid invitation details: %', v_problem using errcode = '23514'; end if;

  if exists (select 1 from public.change_requests where invitation_id = v_inv.id and status = 'pending') then
    raise exception 'A change request is already waiting for review' using errcode = '23505'; end if;
  if (select count(*) from public.change_requests where requested_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many change requests. Try again later' using errcode = '54000'; end if;

  insert into public.change_requests (invitation_id, requested_by, client_email, base_updated_at, proposed_details, changed_keys)
    values (v_inv.id, auth.uid(), v_email, p_base_updated_at, v_proposed, v_changed) returning id into v_id;
  insert into public.notifications (audience, type, invitation_id, request_id, payload)
    values ('admin', 'change_submitted', v_inv.id, v_id, jsonb_build_object('client_email', v_email, 'changed_keys', v_changed));
  return v_id;
end $$;
revoke all on function public.submit_change_request(text, jsonb, timestamptz) from public, anon;
grant execute on function public.submit_change_request(text, jsonb, timestamptz) to authenticated;

create or replace function public.withdraw_change_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.change_requests set status = 'withdrawn' where id = p_id and requested_by = auth.uid() and status = 'pending';
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.withdraw_change_request(uuid) from public, anon;
grant execute on function public.withdraw_change_request(uuid) to authenticated;

-- ---------- Track B (B2), second part: admin review, acknowledgement, audit log ----------
-- Append-only record of review decisions. Only admins can read it; nobody can write it through the API (only the RPCs).
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  invitation_id text,                              -- no foreign key: the history outlives the invitation
  request_id uuid,
  before_hash text,
  after_hash text
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists "audit_log: admin read" on public.audit_log;
create policy "audit_log: admin read" on public.audit_log for select to authenticated using (public.is_admin());

-- Admin decision on a pending request. Approve: the changed keys are laid over the CURRENT live details in one transaction.
-- D7: if the invitation was edited after the client started, approve is refused (40001) unless p_force is true.
create or replace function public.review_change_request(p_id uuid, p_decision text, p_note text default null, p_force boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.change_requests%rowtype;
  inv public.invitations%rowtype;
  v_merged jsonb;
  v_changes jsonb;
  v_problem text;
  v_date date;
begin
  if not public.is_admin() then raise exception 'Only an administrator can review change requests' using errcode = '42501'; end if;
  if p_decision not in ('approve','reject') then raise exception 'decision must be approve or reject' using errcode = '22023'; end if;
  select * into r from public.change_requests where id = p_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  if r.status <> 'pending' then raise exception 'This request is no longer pending' using errcode = '22023'; end if;
  select * into inv from public.invitations where id = r.invitation_id for update;
  if not found then raise exception 'Invitation not found' using errcode = 'P0002'; end if;

  if p_decision = 'reject' then
    if btrim(coalesce(p_note, '')) = '' then raise exception 'A note is required when rejecting' using errcode = '22023'; end if;
    if char_length(p_note) > 1000 then raise exception 'The note is longer than 1000 characters' using errcode = '22023'; end if;
    update public.change_requests set status = 'rejected', admin_note = btrim(p_note), reviewed_by = auth.uid(), reviewed_at = now() where id = r.id;
    insert into public.audit_log (actor, action, invitation_id, request_id, before_hash, after_hash)
      values (auth.uid(), 'reject', inv.id, r.id, md5(inv.details::text), md5(inv.details::text));
    insert into public.notifications (audience, recipient_user_id, type, invitation_id, request_id, payload)
      values ('user', r.requested_by, 'change_rejected', inv.id, r.id, jsonb_build_object('note', btrim(p_note)));
    return;
  end if;

  if inv.deleted_at is not null then raise exception 'The invitation is in the trash' using errcode = '22023'; end if;
  if inv.updated_at > r.base_updated_at and not coalesce(p_force, false) then
    raise exception 'The invitation was edited after the client started. Review again or approve anyway' using errcode = '40001'; end if;

  select jsonb_object_agg(k, r.proposed_details -> k) into v_changes from unnest(r.changed_keys) k;
  v_merged := inv.details || coalesce(v_changes, '{}'::jsonb);
  v_problem := public.details_problem(v_merged);
  if v_problem is not null then raise exception 'Invalid invitation details: %', v_problem using errcode = '23514'; end if;

  update public.invitations set
    details = v_merged,
    groom_name = case when 'groomEn' = any (r.changed_keys) then v_merged ->> 'groomEn' else groom_name end,
    bride_name = case when 'brideEn' = any (r.changed_keys) then v_merged ->> 'brideEn' else bride_name end,
    event_date = case when 'weddingDate' = any (r.changed_keys) then
      (case when (v_merged ->> 'weddingDate') ~ '^\d{4}-\d{2}-\d{2}$' then (v_merged ->> 'weddingDate')::date else null end) else event_date end
    where id = inv.id;
  update public.change_requests set status = 'approved', admin_note = nullif(btrim(coalesce(p_note, '')), ''),
    reviewed_by = auth.uid(), reviewed_at = now() where id = r.id;
  insert into public.audit_log (actor, action, invitation_id, request_id, before_hash, after_hash)
    values (auth.uid(), case when inv.updated_at > r.base_updated_at then 'approve-forced' else 'approve' end,
            inv.id, r.id, md5(inv.details::text), md5(v_merged::text));
  insert into public.notifications (audience, recipient_user_id, type, invitation_id, request_id, payload)
    values ('user', r.requested_by, 'change_approved', inv.id, r.id, '{}'::jsonb);
end $$;
revoke all on function public.review_change_request(uuid, text, text, boolean) from public, anon;
grant execute on function public.review_change_request(uuid, text, text, boolean) to authenticated;

-- The client dismisses a decision (the "rejected" or "your changes are live" banner). Requester only.
create or replace function public.acknowledge_rejection(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.change_requests set acknowledged_at = now()
    where id = p_id and requested_by = auth.uid() and status in ('approved','rejected') and acknowledged_at is null;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.acknowledge_rejection(uuid) from public, anon;
grant execute on function public.acknowledge_rejection(uuid) to authenticated;

-- ---------- Track B (B2), third part: notifications, template read for the client editor, role default ----------
-- In-app notifications (D8). Email is sent separately by an Edge Function (B3) and is never the only record.
-- audience 'admin': one shared row for all admins (the first admin who marks it read marks it for everyone).
-- audience 'user': addressed to one person. Only the RPCs and triggers insert; people can only set read_at on rows they can see.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  audience text not null check (audience in ('admin','user')),
  recipient_user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  invitation_id text,
  request_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((audience = 'admin' and recipient_user_id is null) or (audience = 'user' and recipient_user_id is not null))
);
create index if not exists notifications_user_idx on public.notifications (recipient_user_id, created_at desc) where audience = 'user';
create index if not exists notifications_admin_idx on public.notifications (created_at desc) where audience = 'admin';
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists "notifications: read" on public.notifications;
create policy "notifications: read" on public.notifications for select to authenticated
  using ((audience = 'user' and recipient_user_id = auth.uid()) or (audience = 'admin' and public.is_admin()));
drop policy if exists "notifications: mark read" on public.notifications;
create policy "notifications: mark read" on public.notifications for update to authenticated
  using ((audience = 'user' and recipient_user_id = auth.uid()) or (audience = 'admin' and public.is_admin()))
  with check ((audience = 'user' and recipient_user_id = auth.uid()) or (audience = 'admin' and public.is_admin()));
-- push new rows to the browser (Realtime), where the publication exists (Supabase has it, a plain Postgres does not)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- The template HTML a client needs for the editor preview. Clients cannot read `templates`; this returns the HTML of
-- the template of one invitation linked to their verified email, nothing else.
create or replace function public.client_template_html(p_invitation_id text) returns text
language plpgsql stable security definer set search_path = public as $$
declare v_html text; v_found boolean;
begin
  if auth.uid() is null or public.current_user_email() is null then
    raise exception 'Sign in with a verified email' using errcode = '42501'; end if;
  select t.html_code, true into v_html, v_found
    from public.invitations i left join public.templates t on t.id = i.template_id
    where i.id = p_invitation_id and i.client_email = public.current_user_email() and i.deleted_at is null;
  if v_found is not true then raise exception 'Invitation not found' using errcode = 'P0002'; end if;
  return v_html;
end $$;
revoke all on function public.client_template_html(text) from public, anon;
grant execute on function public.client_template_html(text) to authenticated;

-- Who is an administrator is decided by the `admins` table. profiles.role is only a label shown in the menu:
-- new accounts are 'Member', and an account added to `admins` becomes 'Administrator'.
alter table public.profiles alter column role set default 'Member';
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'Member')
  on conflict (id) do nothing;
  return new;
end $$;
create or replace function public.admins_set_label() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'Administrator' where id = new.user_id;
  return null;
end $$;
drop trigger if exists admins_set_label on public.admins;
create trigger admins_set_label after insert on public.admins for each row execute function public.admins_set_label();
update public.profiles set role = 'Member'
  where role = 'Administrator' and id not in (select user_id from public.admins);
update public.profiles set role = 'Administrator' where id in (select user_id from public.admins);
