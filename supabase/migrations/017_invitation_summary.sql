-- Admin Dashboard / All Invitations load only the newest few invitations, so the numbers on the stat cards and
-- the tab counts come from the database instead of from the loaded rows. Admin only. Run in Supabase > SQL Editor
-- after 016 (safe to run twice).

create or replace function public.invitation_summary(p_today date default current_date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;

  select jsonb_build_object(
    'total',      count(*),
    'published',  count(*) filter (where coalesce(published, true)),
    'drafts',     count(*) filter (where not coalesce(published, true)),
    'upcoming',   count(*) filter (where event_date is not null and event_date - p_today between 0 and 30),
    'week',       count(*) filter (where event_date is not null and event_date - p_today between 0 and 7),
    'past',       count(*) filter (where event_date is not null and event_date < p_today),
    'views',      coalesce(sum(coalesce(views, 0)), 0),
    'viewed',     count(*) filter (where coalesce(views, 0) > 0),
    'draft_soon', count(*) filter (where not coalesce(published, true) and event_date is not null and event_date - p_today between 0 and 7),
    'no_views',   count(*) filter (where coalesce(published, true) and (event_date is null or event_date >= p_today) and coalesce(views, 0) = 0)
  ) into r
  from public.invitations where deleted_at is null;

  r := r || jsonb_build_object(
    'trashed', (select count(*) from public.invitations where deleted_at is not null and deleted_at > now() - interval '30 days'),
    'top_id', case when (r->>'total')::int < 2 then null else
      (select i.id from public.invitations i where i.deleted_at is null order by coalesce(i.views, 0) desc, i.created_at desc, i.id desc limit 1) end,
    'templates', coalesce((
      select jsonb_agg(jsonb_build_object('key', k, 'name', n, 'n', c) order by c desc, n)
      from (
        select coalesce(nullif(template_id, ''), coalesce(nullif(template_name, ''), 'Custom invitation')) as k,
               coalesce(nullif(template_name, ''), 'Custom invitation') as n,
               count(*) as c
        from public.invitations where deleted_at is null group by 1, 2
      ) t), '[]'::jsonb));
  return r;
end $$;

revoke all on function public.invitation_summary(date) from public, anon;
grant execute on function public.invitation_summary(date) to authenticated;
