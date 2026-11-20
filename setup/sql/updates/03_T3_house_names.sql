-- setup/sql/updates/03_T3_house_names.sql
-- Task T3 (separate house names, gotram, honorific). Run this ONCE on a live project that was set up before T3 (Supabase > SQL editor).
-- A clean project does not need it: setup/sql/01_schema.sql already contains the same two functions.
-- Safe to re-run (create or replace). It changes no table and no data; the grants on both functions are kept.
-- Run 01_T1_parent_status.sql and 02_T2_closing_names.sql first if they have not been run (this file contains everything from T1 and T2 too).
--   1. details_problem(): accepts the eight house-name / gotram keys (text) and coupleHonorific ('' or 'chiranjeevi').
--   2. submit_change_request(): a client may change those nine keys from /my.

create or replace function public.details_problem(d jsonb) returns text
language plpgsql immutable as $$
declare
  k text; v jsonb; item jsonb; s text;
  text_keys  text[] := array['customId','templateId','surnameEn','surnameTe','weddingDate','muhurthamTime','groomEn','groomTe',
    'groomFatherEn','groomFatherTe','groomFatherPhone','groomMotherEn','groomMotherTe','groomMotherPhone','brideEn','brideTe',
    'brideFatherEn','brideFatherTe','brideFatherPhone','brideMotherEn','brideMotherTe','brideMotherPhone','receptionDate',
    'receptionTime','venueEn','venueTe','venueAddress','venueMaps','seoTitle','seoDescription','seoImage','inviterMode','inviterEn','inviterTe','inviteMessageTe',
    'groomFatherStatus','groomMotherStatus','brideFatherStatus','brideMotherStatus',
    'closingTitleMode','closingTitleEn','closingTitleTe','inviterSources',
    'groomSurnameEn','groomSurnameTe','brideSurnameEn','brideSurnameTe','groomGotramEn','groomGotramTe','brideGotramEn','brideGotramTe','coupleHonorific'];
  url_keys   text[] := array['venueMaps','seoImage'];
  phone_keys text[] := array['groomFatherPhone','groomMotherPhone','brideFatherPhone','brideMotherPhone'];
  status_keys text[] := array['groomFatherStatus','groomMotherStatus','brideFatherStatus','brideMotherStatus'];  -- T1: '' alive, 'late', 'hidden'
  list_keys  text[] := array['events','groomContacts','brideContacts','inviterNames'];
  sub_text   text[] := array['id','name','nameTe','nameEn','date','time','venue','venueTe','maps','phone','prefix','relationEn','relationTe'];
begin
  if d is null or jsonb_typeof(d) <> 'object' then return 'details must be a JSON object'; end if;
  if octet_length(d::text) > 65536 then return 'details is larger than 64 KB'; end if;

  for k, v in select * from jsonb_each(d) loop
    if k = any (text_keys) then
      if jsonb_typeof(v) not in ('string','null') then return k || ' must be text'; end if;
      s := v #>> '{}';
      if s is not null then
        if char_length(s) > 1000 then return k || ' is longer than 1000 characters'; end if;
        if k = 'seoTitle' and char_length(s) > 200 then return 'seoTitle is too long'; end if;
        if k = 'seoDescription' and char_length(s) > 400 then return 'seoDescription is too long'; end if;
        if k = any (url_keys) and not public.is_safe_url(s) then return k || ' has a link type that is not allowed'; end if;
        -- M-4: the preview image must be a file from this app's own preview bucket (same shape as src/lib/previewUrl.ts).
        if k = 'seoImage' and btrim(s) <> '' and s !~ '^https://[^/?#[:space:]@]+/storage/v1/object/public/invitation-previews/[^/?#[:space:]]+/[^/?#[:space:]]+\.jpg(\?v=[0-9]+)?$' then
          return 'seoImage must be a preview image uploaded in this app'; end if;
        if k = any (status_keys) and s not in ('', 'late', 'hidden') then
          return k || ' must be empty, late or hidden'; end if;
        -- T3: the honorific before the couple's names is off ('') or 'chiranjeevi'
        if k = 'coupleHonorific' and s not in ('', 'chiranjeevi') then
          return 'coupleHonorific must be empty or chiranjeevi'; end if;
        -- T2: closing title preset and the list of people who appear (same rules as src/lib/inviteText.ts)
        if k = 'closingTitleMode' and s not in ('', 'itlu', 'aahvaninchuvaaru', 'compliments', 'invitedBy', 'regards', 'custom', 'none') then
          return 'closingTitleMode is not a known title'; end if;
        if k = 'inviterSources' and s !~ '^(none)?$|^(groom|groomFather|groomMother|bride|brideFather|brideMother|groomFamily|brideFamily|surname)(,(groom|groomFather|groomMother|bride|brideFather|brideMother|groomFamily|brideFamily|surname))*$' then
          return 'inviterSources has an unknown person'; end if;
        -- T1: the phone of a late or hidden parent is never shown, so its format is not checked (same rule as src/lib/validate.ts)
        if k = any (phone_keys) and btrim(s) <> ''
           and coalesce(d ->> replace(k, 'Phone', 'Status'), '') = '' and not (
             s ~ '^[+0-9 ()-]+$' and char_length(regexp_replace(s, '\D', '', 'g')) between 10 and 13) then
          return k || ' is not a valid phone number'; end if;
      end if;
    elsif k = 'receptionEnabled' then
      if jsonb_typeof(v) <> 'boolean' then return 'receptionEnabled must be true or false'; end if;
    elsif k = any (list_keys) then
      if jsonb_typeof(v) <> 'array' then return k || ' must be a list'; end if;
      if jsonb_array_length(v) > 20 then return k || ' has more than 20 items'; end if;
      if k = 'inviterNames' and jsonb_array_length(v) > 8 then return 'inviterNames has more than 8 names'; end if;
      for item in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(item) <> 'object' then return k || ' items must be objects'; end if;
        declare ik text; iv jsonb; is_ text; begin
          for ik, iv in select * from jsonb_each(item) loop
            if ik = any (sub_text) then
              if jsonb_typeof(iv) not in ('string','null') then return k || '.' || ik || ' must be text'; end if;
              is_ := iv #>> '{}';
              if is_ is not null and char_length(is_) > 1000 then return k || '.' || ik || ' is longer than 1000 characters'; end if;
              if ik = 'maps' and not public.is_safe_url(is_) then return k || '.maps has a link type that is not allowed'; end if;
              if k = 'inviterNames' and ik = 'prefix' and coalesce(is_, '') not in ('', 'sri', 'smt', 'chi', 'late', 'dr') then
                return 'inviterNames.prefix is not a known prefix'; end if;
              if ik = 'phone' and btrim(coalesce(is_, '')) <> '' and not (
                   is_ ~ '^[+0-9 ()-]+$' and char_length(regexp_replace(is_, '\D', '', 'g')) between 10 and 13) then
                return k || '.phone is not a valid phone number'; end if;
            end if;
          end loop;
        end;
      end loop;
    end if;
    -- other keys (templateId aliases, UI flags) are left alone; the compiler only reads the keys above.
  end loop;
  return null;
end $$;

create or replace function public.submit_change_request(p_invitation_id text, p_details jsonb, p_base_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['surnameEn','surnameTe','weddingDate','muhurthamTime','groomEn','groomTe','groomFatherEn','groomFatherTe',
    'groomFatherPhone','groomMotherEn','groomMotherTe','groomMotherPhone','brideEn','brideTe','brideFatherEn','brideFatherTe',
    'brideFatherPhone','brideMotherEn','brideMotherTe','brideMotherPhone','receptionEnabled','receptionDate','receptionTime',
    'venueEn','venueTe','venueAddress','venueMaps','events','groomContacts','brideContacts','seoTitle','seoDescription','inviterMode','inviterEn','inviterTe','inviteMessageTe',
    'groomFatherStatus','groomMotherStatus','brideFatherStatus','brideMotherStatus',
    'closingTitleMode','closingTitleEn','closingTitleTe','inviterSources','inviterNames',
    'groomSurnameEn','groomSurnameTe','brideSurnameEn','brideSurnameTe','groomGotramEn','groomGotramTe','brideGotramEn','brideGotramTe','coupleHonorific'];
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
