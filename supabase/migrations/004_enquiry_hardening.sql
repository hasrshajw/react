-- Schedy migration 004 (H-5): harden public enquiry inserts.
-- Run once in Supabase > SQL Editor. Safe to re-run. Already included in supabase/schema.sql.
-- Existing enquiry rows are not changed or re-checked.

-- ---------- enquiry insert hardening (was migration 004, H-5 database half) ----------
-- The public website form inserts enquiries with the anon key, so everything a stranger can write is limited here:
--   1. Column grants: anon and signed-in users may set only name, phone, email and message. note, status,
--      follow_up_date, history, id and created_at always take their defaults (admins change them with UPDATE).
--   2. The insert policy also requires those default values, as a second lock.
--   3. A trigger checks lengths and formats (message <= 2000 characters, name <= 100, phone, email) and refuses a 6th
--      enquiry from the same phone number or email within one hour. It is a trigger, not a CHECK, so old rows stay
--      updatable. The count runs as the table owner (security definer) because anon cannot read the table.
-- Not done here: captcha and a per-IP rate limit. The database does not see the visitor's IP; that needs an Edge
-- Function or Vercel route in front of the insert (see task H-5 in task.md).
-- The public form must not ask for the inserted row back (no `.select()` / `Prefer: return=representation`): anon
-- has no read access, so that request would be refused.
revoke insert on public.enquiries from anon, authenticated;
grant insert (name, phone, email, message) on public.enquiries to anon, authenticated;

drop policy if exists "enquiries: public insert" on public.enquiries;
create policy "enquiries: public insert" on public.enquiries for insert to anon, authenticated
  with check (status = 'new' and note = '' and follow_up_date is null and history = '[]'::jsonb);

create index if not exists enquiries_email_recent_idx on public.enquiries (lower(email), created_at desc);
create index if not exists enquiries_phone_recent_idx on public.enquiries (phone, created_at desc);

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

  if new.phone is not null or new.email is not null then
    select count(*) into recent from public.enquiries e
     where e.created_at > now() - interval '1 hour'
       and ((new.phone is not null and e.phone = new.phone) or (new.email is not null and lower(e.email) = new.email));
    if recent >= 5 then
      raise exception 'Too many enquiries from this contact. Please try again later.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enquiries_check_insert on public.enquiries;
create trigger enquiries_check_insert before insert on public.enquiries
  for each row execute function public.enquiries_check_insert();

