-- Schedy migration 009 (task L-8): the trash date is the server's, and the 30-day purge runs on the server.
-- Run in Supabase dashboard > SQL Editor. Safe to run more than once. (Already included in supabase/schema.sql.)
--
-- Before, the browser wrote `deleted_at` from its own clock and also decided which trashed invitations were old enough to
-- delete. A phone with a wrong clock could trash an invitation "a year ago" (deleted for good on the next page open) or,
-- with its clock ahead, make every trashed invitation look expired. Now:
--   1. A trigger sets `deleted_at` to the server time when an invitation is trashed through the API (the app, or REST with a
--      user's login). The value the browser sends is ignored; re-trashing an invitation that is already in the trash keeps the
--      first date; restoring (null) is always allowed. The SQL Editor (role postgres) and the service role are NOT stamped, so
--      you can still set a date by hand, for example to test the purge:
--        update public.invitations set deleted_at = now() - interval '31 days' where id = '<id>';
--   2. trash_retention() holds the number of days (30) in one place. To change it, edit that function (and TRASH_DAYS in
--      src/lib/dashboardData.ts, which only drives the labels on screen).
--   3. expired_trash_ids() lists the caller's invitations that are past the retention. The Dashboard asks it instead of
--      comparing dates in the browser, then removes each one together with its preview image file (see deleteInvitation).
--   4. purge_expired_trash() deletes every expired invitation for all owners. It is scheduled daily with pg_cron when that
--      extension is available (Database > Extensions > pg_cron in the dashboard); otherwise a notice says so and the
--      Dashboard purge (point 3) is the only cleaner. The scheduled job removes rows only, NOT the preview image files
--      (SQL cannot delete stored files); files left behind are for the orphan cleanup job (task M-4, still open).

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
