-- Migration 010: Track B (B2), first part. Client email on invitations, change requests, and the RPCs a client uses.
-- Run in Supabase > SQL Editor (safe to run twice). The same SQL is folded into supabase/schema.sql.
-- Not yet included (next B-M1 update): review_change_request (admin approve/reject), acknowledge_rejection,
-- notifications, audit_log, a client-safe template read for the editor preview, and the sign-up role default.
-- Requires 005_admin_role.sql (is_admin) and 003_details_validation.sql (details_problem) to have run first.

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
    update public.change_requests set status = 'superseded' where invitation_id = new.id and status = 'pending';
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

create or replace function public.my_invitations() returns table (
  id text, groom_name text, bride_name text, event_date date, template_id text, published boolean, details jsonb,
  updated_at timestamptz, request_id uuid, request_status text, request_admin_note text,
  request_created_at timestamptz, request_acknowledged_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.groom_name, i.bride_name, i.event_date, i.template_id, i.published, i.details, i.updated_at,
         r.id, r.status, r.admin_note, r.created_at, r.acknowledged_at
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
