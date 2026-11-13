-- B6 D5: client editor needs the proposed snapshot while a request is pending/rejected.
-- Return type change requires DROP first (CREATE OR REPLACE cannot widen OUT columns).

drop function if exists public.my_invitations();

create function public.my_invitations() returns table (
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
