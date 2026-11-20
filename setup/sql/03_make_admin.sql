-- 03_make_admin.sql  -  Run AFTER 01_schema.sql, once your login user exists.
--
-- Who is an administrator is decided by the public.admins table (not by the browser or by VITE_ADMIN_EMAIL).
-- Without a row here the dashboard shows no templates, categories or enquiries.
--
-- Before running:
--   1. Supabase > Authentication > Users > Add user > Create new user (email + password, tick "Auto Confirm User").
--   2. Replace you@example.com below with that exact email. Run.
-- It stops with an error (and changes nothing) if no user with that email exists.

do $$
declare
  admin_email constant text := 'you@example.com';   -- <<< CHANGE THIS
  n integer;
begin
  insert into public.admins (user_id, email)
  select id, email from auth.users where lower(email) = lower(admin_email)
  on conflict (user_id) do nothing;

  select count(*) into n from public.admins a join auth.users u on u.id = a.user_id where lower(u.email) = lower(admin_email);
  if n = 0 then
    raise exception 'No user with email % found in Authentication > Users. Create the user first, then run this again.', admin_email;
  end if;
  raise notice 'OK: % is an administrator.', admin_email;
end $$;
