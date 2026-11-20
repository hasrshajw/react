-- Tighten public enquiry rate limit (3 per phone/email per hour instead of 5).
-- Safe to re-run. New projects that use the current 01_schema.sql already get this limit.

create or replace function public.enquiries_check_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare digits text; recent int;
begin
  new.name    := nullif(btrim(coalesce(new.name, '')), '');
  new.phone   := nullif(btrim(coalesce(new.phone, '')), '');
  new.email   := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.message := nullif(btrim(coalesce(new.message, '')), '');

  if char_length(coalesce(new.name, ''))    > 100  then raise exception 'Enquiry name is longer than 100 characters'    using errcode = '23514'; end if;
  if char_length(coalesce(new.message, '')) > 2000 then raise exception 'Enquiry message is longer than 2000 characters' using errcode = '23514'; end if;

  if new.phone is not null then
    digits := regexp_replace(new.phone, '\D', '', 'g');
    if new.phone !~ '^[+0-9 ()-]+$' or char_length(new.phone) > 20 or char_length(digits) not between 10 and 13 then
      raise exception 'Enquiry phone number is not valid' using errcode = '23514';
    end if;
  end if;
  if new.email is not null and (char_length(new.email) > 254 or new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'Enquiry email is not valid' using errcode = '23514';
  end if;

  -- Rate limit: at most 3 enquiries from the same phone or email in one hour.
  if new.phone is not null or new.email is not null then
    select count(*) into recent from public.enquiries e
     where e.created_at > now() - interval '1 hour'
       and ((new.phone is not null and e.phone = new.phone) or (new.email is not null and lower(e.email) = new.email));
    if recent >= 3 then
      raise exception 'Too many enquiries from this contact. Please try again later.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
