-- Schedy migration 007 (task H-4): view counting is separate from reading the invitation, counts a visitor once a day,
-- and is capped per invitation. Run in Supabase dashboard > SQL Editor. Safe to run more than once.
-- (Already included in supabase/schema.sql; run this file only on a project that was set up before.)
--
-- Before: get_public_invitation() added 1 to `views` on every call, so anyone could inflate the counter with a loop of
-- requests, a link-preview bot counted as a guest, and every view also bumped `updated_at`.
-- Now:
--   * get_public_invitation() only reads, and returns just what the page needs (names, details, template HTML).
--   * record_invitation_view(slug, visitor) is the only thing that counts. The browser sends a random id it keeps in
--     localStorage; the same id counts once per invitation per day (UTC).
--   * At most 120 counted views per invitation per minute, so a script that sends a new id every time can only add
--     a bounded number of views.
--   * A view no longer changes `updated_at` (it will matter for Track B's conflict check).
-- What this does NOT stop: a determined script that rotates ids can still add up to 120 views a minute to one
-- invitation. Per-IP limits need to be set in Vercel / Supabase (dashboard), the database cannot see the IP.

-- 1. the invitation page only reads
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

-- 2. bookkeeping tables (not readable or writable through the API; only the function below touches them)
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

-- 3. the counter. Returns true only when the view was counted.
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

-- 4. a view must not look like an edit: keep `updated_at` when only `views` changed
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
