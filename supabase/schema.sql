-- Schedy database schema for Supabase. Run once in: Supabase dashboard > SQL Editor.
-- Safe to run again: everything uses "if not exists" / "or replace".

create table if not exists public.categories (
  id text primary key,
  name text not null
);

create table if not exists public.templates (
  id text primary key,
  category_id text references public.categories(id),
  name text not null,
  html_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id text primary key,
  slug text not null,                       -- the link ID: /i/<slug>
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  groom_name text,
  bride_name text,
  event_date date,
  template_id text,
  template_name text,
  details jsonb not null default '{}'::jsonb, -- the whole form (names, venue, events, photos...)
  views integer not null default 0,
  published boolean not null default true,
  deleted_at timestamptz,                    -- set = in the trash
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one invitation per link ID, ignoring upper/lower case
create unique index if not exists invitations_slug_key on public.invitations (lower(slug));
create index if not exists invitations_owner_idx on public.invitations (owner, created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists invitations_touch on public.invitations;
create trigger invitations_touch before update on public.invitations
  for each row execute function public.touch_updated_at();

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  message text,
  status text not null default 'new' check (status in ('new','followup','called','cancelled')),
  note text not null default '',
  follow_up_date date,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text default 'Administrator',
  plan_name text default 'Pro',
  plan_status text default 'trial' check (plan_status in ('trial','active','past_due')),
  trial_ends_at timestamptz default (now() + interval '14 days')
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row level security ----------
alter table public.categories  enable row level security;
alter table public.templates   enable row level security;
alter table public.invitations enable row level security;
alter table public.enquiries   enable row level security;
alter table public.profiles    enable row level security;

drop policy if exists "categories: signed-in all" on public.categories;
create policy "categories: signed-in all" on public.categories for all to authenticated using (true) with check (true);

drop policy if exists "templates: signed-in all" on public.templates;
create policy "templates: signed-in all" on public.templates for all to authenticated using (true) with check (true);

drop policy if exists "invitations: owner all" on public.invitations;
create policy "invitations: owner all" on public.invitations for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Enquiries: anyone (the public website form) may add one; only signed-in admins may read or change them.
drop policy if exists "enquiries: public insert" on public.enquiries;
create policy "enquiries: public insert" on public.enquiries for insert to anon, authenticated with check (status = 'new');
drop policy if exists "enquiries: admin read" on public.enquiries;
create policy "enquiries: admin read" on public.enquiries for select to authenticated using (true);
drop policy if exists "enquiries: admin update" on public.enquiries;
create policy "enquiries: admin update" on public.enquiries for update to authenticated using (true) with check (true);

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- public invitation page ----------
-- Customers are not signed in, so they cannot read the table. This function hands out exactly one
-- published, non-deleted invitation (plus its template HTML) for a link ID, and counts the view.
create or replace function public.get_public_invitation(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.invitations; t public.templates;
begin
  select * into r from public.invitations
   where lower(slug) = lower(p_slug) and published and deleted_at is null limit 1;
  if not found then return null; end if;
  select * into t from public.templates where id = coalesce(r.template_id, r.details->>'templateId');
  update public.invitations set views = views + 1 where id = r.id;
  return jsonb_build_object(
    'id', r.id, 'groom_name', r.groom_name, 'bride_name', r.bride_name, 'event_date', r.event_date,
    'template_id', r.template_id, 'template_name', r.template_name, 'details', r.details,
    'html_code', t.html_code);
end $$;
revoke all on function public.get_public_invitation(text) from public;
grant execute on function public.get_public_invitation(text) to anon, authenticated;
