-- Schedy migration 008 (task L-7): the status history of an enquiry is written by the database.
-- Run in Supabase dashboard > SQL Editor. Safe to run more than once. (Already included in supabase/schema.sql.)
--
-- Before, the browser sent the whole `history` array with every save. Two admins (or two tabs) changing the status of the
-- same enquiry overwrote each other's entries, the time came from the browser clock, and any signed-in admin session
-- could rewrite the history. Now a trigger appends one entry ({status, at}) with the server time whenever `status`
-- changes, and keeps the stored history for every other update, whatever the client sends.
-- Editing `history` by hand in the SQL Editor is also ignored by the trigger; to repair a history, disable the trigger
-- for that statement (alter table public.enquiries disable trigger enquiries_history; ... enable trigger ...).

create or replace function public.enquiries_history() returns trigger language plpgsql as $$
begin
  new.history := coalesce(old.history, '[]'::jsonb);
  if new.status is distinct from old.status then
    new.history := new.history || jsonb_build_array(jsonb_build_object(
      'status', new.status,
      'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  end if;
  return new;
end $$;

drop trigger if exists enquiries_history on public.enquiries;
create trigger enquiries_history before update on public.enquiries
  for each row execute function public.enquiries_history();
