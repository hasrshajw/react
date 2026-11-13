-- Migration 011: Track B (B2), second part. Admin review of change requests, acknowledgement, audit log.
-- Run in Supabase > SQL Editor after 010 (safe to run twice). The same SQL is folded into supabase/schema.sql.
-- Still to come: notifications, a client-safe template read for the editor preview, the sign-up role default.

-- ---------- Track B (B2), second part: admin review, acknowledgement, audit log ----------
-- Append-only record of review decisions. Only admins can read it; nobody can write it through the API (only the RPCs).
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  invitation_id text,                              -- no foreign key: the history outlives the invitation
  request_id uuid,
  before_hash text,
  after_hash text
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists "audit_log: admin read" on public.audit_log;
create policy "audit_log: admin read" on public.audit_log for select to authenticated using (public.is_admin());

-- Admin decision on a pending request. Approve: the changed keys are laid over the CURRENT live details in one transaction.
-- D7: if the invitation was edited after the client started, approve is refused (40001) unless p_force is true.
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
end $$;
revoke all on function public.review_change_request(uuid, text, text, boolean) from public, anon;
grant execute on function public.review_change_request(uuid, text, text, boolean) to authenticated;

-- The client dismisses a decision (the "rejected" or "your changes are live" banner). Requester only.
create or replace function public.acknowledge_rejection(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.change_requests set acknowledged_at = now()
    where id = p_id and requested_by = auth.uid() and status in ('approved','rejected') and acknowledged_at is null;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.acknowledge_rejection(uuid) from public, anon;
grant execute on function public.acknowledge_rejection(uuid) to authenticated;
