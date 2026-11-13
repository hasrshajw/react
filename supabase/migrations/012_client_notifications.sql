-- Migration 012: Track B (B2), third part. In-app notifications, the client's template read, the sign-up role label.
-- Run in Supabase > SQL Editor after 010 and 011 (safe to run twice). The same SQL is folded into supabase/schema.sql.
-- It replaces three functions from 010/011 so that they also write notifications:
--   submit_change_request (tells the admins), review_change_request (tells the client), invitations_supersede_requests (tells the client).
-- Email is not sent here: that is an Edge Function (B3).

-- ---- functions that now notify ----
create or replace function public.invitations_supersede_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- B7: also supersede when the invitation is unpublished while a request is pending.
  if new.client_email is distinct from old.client_email
     or (new.deleted_at is not null and old.deleted_at is null)
     or (new.published is false and old.published is distinct from false) then
    with s as (update public.change_requests set status = 'superseded' where invitation_id = new.id and status = 'pending' returning id, requested_by)
    insert into public.notifications (audience, recipient_user_id, type, invitation_id, request_id)
      select 'user', requested_by, 'change_superseded', new.id, id from s;
  end if;
  return null;
end $$;

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
