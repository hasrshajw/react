-- setup/sql/updates/07_T7_contacts.sql
-- Task T7 (up to 3 extra contacts per side, contact role). Run this ONCE on a live project that was set up before T7 (Supabase > SQL editor).
-- A clean project does not need it: setup/sql/01_schema.sql already contains the same function.
-- Safe to re-run (create or replace). It changes no table and no data; the grants on the function are kept.
-- Run 01_T1_parent_status.sql to 06_T6_events.sql first if they have not been run (this function contains everything from T1 to T6 too).
--   1. details_problem(): every item of groomContacts / brideContacts may carry the text keys roleEn and roleTe (each up to 1000 characters),
--      and each of those two lists may have at most 3 items (the form allows 3).
--   submit_change_request() needs no change: both lists were already on its `allowed` list.

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
    'groomSurnameEn','groomSurnameTe','brideSurnameEn','brideSurnameTe','groomGotramEn','groomGotramTe','brideGotramEn','brideGotramTe','coupleHonorific',
    'groomOrder','brideOrder','showParentage',
    'receptionVenueEn','receptionVenueTe','receptionVenueAddress','receptionVenueMaps'];
  url_keys   text[] := array['venueMaps','seoImage','receptionVenueMaps'];
  phone_keys text[] := array['groomFatherPhone','groomMotherPhone','brideFatherPhone','brideMotherPhone'];
  status_keys text[] := array['groomFatherStatus','groomMotherStatus','brideFatherStatus','brideMotherStatus'];  -- T1: '' alive, 'late', 'hidden'
  list_keys  text[] := array['events','groomContacts','brideContacts','inviterNames'];
  sub_text   text[] := array['id','name','nameTe','nameEn','date','time','venue','venueTe','maps','phone','prefix','relationEn','relationTe',
    'type','endTime','descEn','descTe','dress',   -- T6: these five belong to events
    'roleEn','roleTe'];                            -- T7: contact role
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
        -- T4: birth order (same list as BIRTH_ORDERS in src/lib/inviteText.ts) and the parentage-line switch
        if k in ('groomOrder', 'brideOrder') and s not in ('', 'only', 'eldest', 'second', 'third', 'fourth', 'youngest') then
          return k || ' is not a known position among children'; end if;
        if k = 'showParentage' and s not in ('', '1') then
          return 'showParentage must be empty or 1'; end if;
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
    elsif k in ('receptionEnabled', 'receptionSameVenue') then   -- T5: receptionSameVenue is the "same venue as the wedding" switch
      if jsonb_typeof(v) <> 'boolean' then return k || ' must be true or false'; end if;
    elsif k = any (list_keys) then
      if jsonb_typeof(v) <> 'array' then return k || ' must be a list'; end if;
      if jsonb_array_length(v) > 20 then return k || ' has more than 20 items'; end if;
      if k = 'inviterNames' and jsonb_array_length(v) > 8 then return 'inviterNames has more than 8 names'; end if;
      if k in ('groomContacts', 'brideContacts') and jsonb_array_length(v) > 3 then return k || ' has more than 3 contacts'; end if;   -- T7 (MAX_CONTACTS)
      for item in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(item) <> 'object' then return k || ' items must be objects'; end if;
        declare ik text; iv jsonb; is_ text; begin
          for ik, iv in select * from jsonb_each(item) loop
            if ik = any (sub_text) then
              if jsonb_typeof(iv) not in ('string','null') then return k || '.' || ik || ' must be text'; end if;
              is_ := iv #>> '{}';
              if is_ is not null and char_length(is_) > 1000 then return k || '.' || ik || ' is longer than 1000 characters'; end if;
              if ik = 'maps' and not public.is_safe_url(is_) then return k || '.maps has a link type that is not allowed'; end if;
              -- T6: event type (same ids as EVENT_TYPES in src/lib/eventTypes.ts) and end time (HH:MM or empty)
              if k = 'events' and ik = 'type' and coalesce(is_, '') not in ('', 'engagement', 'haldi', 'mehendi', 'sangeet', 'pellikoduku', 'pellikuthuru', 'varapuja', 'baraat', 'dinner', 'griha', 'custom') then
                return 'events.type is not a known event type'; end if;
              if k = 'events' and ik = 'endTime' and coalesce(is_, '') !~ '^(([01][0-9]|2[0-3]):[0-5][0-9])?$' then
                return 'events.endTime must be a time like 18:30'; end if;
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
