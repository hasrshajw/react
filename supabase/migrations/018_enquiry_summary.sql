-- Dashboard "Site enquiries": the counts on the card, the "Needs attention" strip and the panel tabs come from the database,
-- so the Dashboard no longer downloads every enquiry (with its history) when it opens. Admin only.
-- Run in Supabase > SQL Editor after 017 (safe to run twice).

create or replace function public.enquiry_summary(p_today date default current_date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'total',      count(*),
      'new',        count(*) filter (where status = 'new'),
      'followup',   count(*) filter (where status = 'followup'),
      'called',     count(*) filter (where status = 'called'),
      'cancelled',  count(*) filter (where status = 'cancelled'),
      'stale_new',  count(*) filter (where status = 'new' and created_at < now() - interval '24 hours'),
      'due_follow', count(*) filter (where status = 'followup' and follow_up_date is not null and follow_up_date <= p_today),
      'newest_id',  (select e.id from public.enquiries e order by e.created_at desc, e.id desc limit 1)
    ) from public.enquiries);
end $$;

revoke all on function public.enquiry_summary(date) from public, anon;
grant execute on function public.enquiry_summary(date) to authenticated;
