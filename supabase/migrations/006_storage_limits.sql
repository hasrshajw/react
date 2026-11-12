-- 006_storage_limits.sql  (M-4)
-- Run in Supabase > SQL Editor. Safe to run more than once. Already folded into schema.sql, so a new project does not need this file.
--
-- 1. The link-preview bucket accepts JPEG only and at most 300 KB per file.
-- 2. `details.seoImage` must be empty or a file from this app's own preview bucket
--    (https://<host>/storage/v1/object/public/invitation-previews/<user>/<file>.jpg, optional ?v=<digits>).
--
-- Rows that already hold another kind of link are NOT changed and stay readable. The rule is checked when `details` changes,
-- so editing such an invitation fails until its preview image is removed or uploaded again. List them first:
--   select id, slug, details->>'seoImage' as seo_image from public.invitations
--   where coalesce(details->>'seoImage', '') <> ''
--     and details->>'seoImage' !~ '^https://[^/?#[:space:]@]+/storage/v1/object/public/invitation-previews/[^/?#[:space:]]+/[^/?#[:space:]]+\.jpg(\?v=[0-9]+)?$';
-- Files already in the bucket that are larger than 300 KB or not JPEG stay where they are; the limit applies to new uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-previews', 'invitation-previews', true, 307200, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 307200, allowed_mime_types = array['image/jpeg'];

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
        -- M-4: the preview image must be a file from this app's own preview bucket (same shape as src/lib/previewUrl.ts).
        if k = 'seoImage' and btrim(s) <> '' and s !~ '^https://[^/?#[:space:]@]+/storage/v1/object/public/invitation-previews/[^/?#[:space:]]+/[^/?#[:space:]]+\.jpg(\?v=[0-9]+)?$' then
          return 'seoImage must be a preview image uploaded in this app'; end if;
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
