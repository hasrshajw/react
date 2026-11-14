-- Dashboard "Auto" refresh: a tiny change marker for the invitation list. Admin only. Run in Supabase > SQL Editor
-- (safe to run twice). The page asks for this one short text every minute and re-reads the list only when it changed.
-- updated_at moves on every edit, publish and trash change (see invitations_touch); a view-count change alone does not,
-- so the total of views is part of the marker too.

create or replace function public.invitation_fingerprint() returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return (
    select count(*)::text || '|' || coalesce(max(updated_at)::text, '') || '|' || coalesce(sum(coalesce(views, 0)), 0)::text
    from public.invitations);
end $$;

revoke all on function public.invitation_fingerprint() from public, anon;
grant execute on function public.invitation_fingerprint() to authenticated;
