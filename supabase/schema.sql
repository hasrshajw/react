-- Schedy database schema for Supabase. Run in: Supabase dashboard > SQL Editor.
--
-- This file is SAFE TO RE-RUN: it never deletes tables or data (tables use "if not exists"; functions, policies and
-- triggers are replaced). It already includes everything from supabase/migrations/001, 003 and 007, so a NEW project only
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
        'favicon','robots','sitemap']));
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

-- ---------- backfill ----------
-- Users who signed up before this script ran have no profile row (the trigger only fires for new users).
insert into public.profiles (id, name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
