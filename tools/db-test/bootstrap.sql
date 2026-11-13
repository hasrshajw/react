-- Test-only stand-in for the parts of Supabase that supabase/schema.sql expects to exist already.
-- It is NOT part of the app and must never be run on a real Supabase project.
-- Loaded by tools/db-test/run.sh into a throwaway local cluster, before schema.sql.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- auth: the users table and auth.uid(), reading the id from the same setting PostgREST uses
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- storage: just enough for the bucket row and the policies on storage.objects
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;

-- what Supabase grants by default, so the tests see the same starting privileges the real project has
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
