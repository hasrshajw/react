-- Client area: read the list light, and the one invitation being worked on in full. Run in Supabase > SQL Editor after 016
-- (safe to run twice). Same access rule as my_invitations(): only the signed-in person's verified email, not trashed.
--   my_invitations_list()  every linked invitation WITHOUT `details` and without the proposed details (only the link ID, custom_id)
--   my_invitation(p_id)    one invitation with everything my_invitations() returns
-- Until this is run the app keeps using my_invitations() (full read), so nothing breaks.

drop function if exists public.my_invitations_list();
drop function if exists public.my_invitation(text);

create function public.my_invitations_list() returns table (
  id text, groom_name text, bride_name text, event_date date, template_id text, published boolean, custom_id text,
  updated_at timestamptz, request_id uuid, request_status text, request_admin_note text,
  request_created_at timestamptz, request_acknowledged_at timestamptz,
  views integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.groom_name, i.bride_name, i.event_date, i.template_id, i.published, i.details->>'customId', i.updated_at,
         r.id, r.status, r.admin_note, r.created_at, r.acknowledged_at,
         coalesce(i.views, 0)::integer, i.created_at
  from public.invitations i
  left join lateral (select c.id, c.status, c.admin_note, c.created_at, c.acknowledged_at from public.change_requests c where c.invitation_id = i.id order by c.created_at desc limit 1) r on true
  where i.client_email = public.current_user_email() and i.deleted_at is null
  order by i.created_at desc
  limit 500;
$$;

create function public.my_invitation(p_id text) returns table (
  id text, groom_name text, bride_name text, event_date date, template_id text, published boolean, details jsonb,
  updated_at timestamptz, request_id uuid, request_status text, request_admin_note text,
  request_created_at timestamptz, request_acknowledged_at timestamptz, request_proposed_details jsonb,
  views integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.groom_name, i.bride_name, i.event_date, i.template_id, i.published, i.details, i.updated_at,
         r.id, r.status, r.admin_note, r.created_at, r.acknowledged_at, r.proposed_details,
         coalesce(i.views, 0)::integer, i.created_at
  from public.invitations i
  left join lateral (select c.* from public.change_requests c where c.invitation_id = i.id order by c.created_at desc limit 1) r on true
  where i.id = p_id and i.client_email = public.current_user_email() and i.deleted_at is null;
$$;

revoke all on function public.my_invitations_list() from public, anon;
grant execute on function public.my_invitations_list() to authenticated;
revoke all on function public.my_invitation(text) from public, anon;
grant execute on function public.my_invitation(text) to authenticated;
