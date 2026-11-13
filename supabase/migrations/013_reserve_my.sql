-- Migration 013: Track B (B4). `my` becomes a reserved link name, because /my is the client area.
-- Run in Supabase > SQL Editor (safe to run twice). The same list is in supabase/schema.sql, src/lib/reserved.ts, api/invite.js and vercel.json.
-- The reserved list is a CHECK constraint that schema.sql only adds when it is missing, so an existing project needs this file to get the new word.
-- Before running, see whether any invitation already uses it (the link format allows 3 to 30 characters, so only an invitation whose id is `my` could):
--   select id, slug from public.invitations where lower(slug) = 'my';
-- It should return no rows. If it returns one, change that invitation's slug first, or the constraint cannot be added.
alter table public.invitations drop constraint if exists invitations_slug_reserved;
alter table public.invitations
  add constraint invitations_slug_reserved
  check (lower(slug) <> all (array[
    'login','invitations','templates','create','inventory','billing','customize',
    'dashboard','api','assets','i','admin','privacy','terms','pricing','about','contact',
    'favicon','robots','sitemap','my']));
