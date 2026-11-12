-- Migration 005 (tasks C-1 and C-3): admin role, admin-only templates/categories/enquiries, locked-down profiles.
-- Run once in the Supabase SQL Editor on an EXISTING project. (A new project gets all of this from schema.sql.)
--
-- BEFORE YOU RUN IT: replace CHANGE-ME@example.com in step 1 with the email you use to sign in to the app.
-- If no admin row exists afterwards, the script stops with an error before any policy is changed, so you cannot lock yourself out.
-- Safe to run again.

-- 1. who is the admin (edit the email)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
insert into public.admins (user_id, email)
select id, email from auth.users where lower(email) = lower('test@gmail.com')
on conflict (user_id) do nothing;

do $$
begin
  if not exists (select 1 from public.admins) and exists (select 1 from auth.users) then
    raise exception 'No admin found. Put your sign-in email into step 1 of this script and run it again. No policy was changed.';
  end if;
end $$;

-- 2. lock the table and add is_admin()
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- 3. policies and grants
-- ---------- row level security ----------
alter table public.categories  enable row level security;
alter table public.templates   enable row level security;
alter table public.invitations enable row level security;
alter table public.enquiries   enable row level security;
alter table public.profiles    enable row level security;

-- Templates and categories: admins only (a signed-in stranger can no longer edit the HTML that every invitation runs).
drop policy if exists "categories: signed-in all" on public.categories;
drop policy if exists "categories: admin all" on public.categories;
create policy "categories: admin all" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "templates: signed-in all" on public.templates;
drop policy if exists "templates: admin all" on public.templates;
create policy "templates: admin all" on public.templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invitations: owner all" on public.invitations;
create policy "invitations: owner all" on public.invitations for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Enquiries: anyone (the public website form) may add one; only admins may read or change them.
-- (the public insert policy and its column grants are defined in the "enquiry insert hardening" section below)
drop policy if exists "enquiries: admin read" on public.enquiries;
create policy "enquiries: admin read" on public.enquiries for select to authenticated using (public.is_admin());
drop policy if exists "enquiries: admin update" on public.enquiries;
create policy "enquiries: admin update" on public.enquiries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles (C-3): a user may read their own row and change only their display name. plan_*, role and
-- trial_ends_at can no longer be set from the browser (they are changed in the dashboard or by a future billing job).
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

