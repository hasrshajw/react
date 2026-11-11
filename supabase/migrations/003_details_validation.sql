-- 003_details_validation.sql  (H-2, database half)
-- Run in Supabase > SQL Editor. Safe to run more than once.
-- Already folded into schema.sql (H-3), so a new project does not need this file. Use it to upgrade an existing
-- project without re-running schema.sql. (schema.sql no longer deletes data; the drop block moved to reset.sql.)
--
-- Why: src/lib/compileInvitation.ts already neutralises bad links in the browser, but anyone holding a login can
-- call the Supabase REST API directly and store whatever they like in invitations.details. This puts the same
-- rules in the database. Keep SAFE schemes in sync with SAFE_PROTOCOLS in src/lib/compileInvitation.ts and
-- the limits in src/lib/validate.ts. Track B's submit_change_request RPC should call details_problem() too.
--
-- Existing rows are NOT re-checked: the trigger only fires when `details` actually changes (so the view counter in
-- get_public_invitation keeps working even for a legacy row). To list old rows that would now be rejected:
--   select id, slug, public.details_problem(details) from public.invitations
--   where public.details_problem(details) is not null;

-- 1. URL rule: same allow-list as the compiler (http, https, tel, mailto; no scheme = relative/#anchor is fine).
--    Control characters and spaces are stripped before reading the scheme ("java\tscript:" is still "javascript:").
create or replace function public.is_safe_url(v text) returns boolean
language sql immutable as $$
  select case
    when v is null then true
    else coalesce(
      (regexp_match(
         regexp_replace(v, '[\x01-\x20\x7f-\xa0\u1680\u180e\u2000-\u200d\u2028\u2029\u202f\u205f\u2060\u3000\ufeff]', '', 'g'),
         '^([A-Za-z][A-Za-z0-9+.-]*):'))[1] ilike any (array['http','https','tel','mailto']),
      true)   -- no scheme at all
  end
$$;

-- 2. Returns NULL when `details` is acceptable, otherwise a short reason. Rules:
--    object, <= 64 KB, every top-level string <= 1000 chars, lists <= 20 items, URL fields use the allow-list,
--    phone fields look like phone numbers (10-13 digits), seoTitle <= 200 and seoDescription <= 400 (hard caps;
--    the UI warns earlier at 60 / 160).
create or replace function public.details_problem(d jsonb) returns text
language plpgsql immutable as $$
declare
  k text; v jsonb; item jsonb; s text;
  text_keys  text[] := array['customId','templateId','surnameEn','surnameTe','weddingDate','muhurthamTime','groomEn','groomTe',
    'groomFatherEn','groomFatherTe','groomFatherPhone','groomMotherEn','groomMotherTe','groomMotherPhone','brideEn','brideTe',
    'brideFatherEn','brideFatherTe','brideFatherPhone','brideMotherEn','brideMotherTe','brideMotherPhone','receptionDate',
    'receptionTime','venueEn','venueTe','venueAddress','venueMaps','seoTitle','seoDescription','seoImage'];
  url_keys   text[] := array['venueMaps','seoImage'];
  phone_keys text[] := array['groomFatherPhone','groomMotherPhone','brideFatherPhone','brideMotherPhone'];
  list_keys  text[] := array['events','groomContacts','brideContacts'];
  sub_text   text[] := array['id','name','nameTe','nameEn','date','time','venue','venueTe','maps','phone'];
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
        if k = any (phone_keys) and btrim(s) <> '' and not (
             s ~ '^[+0-9 ()-]+$' and char_length(regexp_replace(s, '\D', '', 'g')) between 10 and 13) then
          return k || ' is not a valid phone number'; end if;
      end if;
    elsif k = 'receptionEnabled' then
      if jsonb_typeof(v) <> 'boolean' then return 'receptionEnabled must be true or false'; end if;
    elsif k = any (list_keys) then
      if jsonb_typeof(v) <> 'array' then return k || ' must be a list'; end if;
      if jsonb_array_length(v) > 20 then return k || ' has more than 20 items'; end if;
      for item in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(item) <> 'object' then return k || ' items must be objects'; end if;
        declare ik text; iv jsonb; is_ text; begin
          for ik, iv in select * from jsonb_each(item) loop
            if ik = any (sub_text) then
              if jsonb_typeof(iv) not in ('string','null') then return k || '.' || ik || ' must be text'; end if;
              is_ := iv #>> '{}';
              if is_ is not null and char_length(is_) > 1000 then return k || '.' || ik || ' is longer than 1000 characters'; end if;
              if ik = 'maps' and not public.is_safe_url(is_) then return k || '.maps has a link type that is not allowed'; end if;
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

create or replace function public.details_is_valid(d jsonb) returns boolean
language sql immutable as $$ select public.details_problem(d) is null $$;

-- 3. Enforce on insert and whenever `details` changes. A trigger (not a CHECK) so legacy rows stay updatable
--    for other columns such as `views`, `published` and `deleted_at`.
create or replace function public.invitations_check_details() returns trigger
language plpgsql as $$
declare p text;
begin
  if tg_op = 'UPDATE' and new.details is not distinct from old.details then return new; end if;
  p := public.details_problem(new.details);
  if p is not null then
    raise exception 'Invalid invitation details: %', p using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists invitations_check_details on public.invitations;
create trigger invitations_check_details before insert or update on public.invitations
  for each row execute function public.invitations_check_details();
