-- 001_seo_previews.sql
-- Run in Supabase > SQL Editor. Safe to run more than once.
-- Already folded into schema.sql (H-3), so a new project does not need this file. Use it to upgrade an existing
-- project without re-running schema.sql. (schema.sql no longer deletes data; the drop block moved to reset.sql.)
--
-- Before running section 3, check existing rows with this query. It must return no rows:
--   select id, slug from public.invitations
--   where not (lower(slug) ~ '^[a-z0-9_-]{3,30}$' or slug = id)
--      or lower(slug) = any (array[
--        'login','invitations','templates','create','inventory','billing','customize',
--        'dashboard','api','assets','i','admin','privacy','terms','pricing','about','contact',
--        'favicon','robots','sitemap']);
-- Fix any rows it returns (change their details.customId and slug) before continuing.

-- 1. Public bucket for link-preview images --------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invitation-previews', 'invitation-previews', true)
on conflict (id) do nothing;

drop policy if exists "previews: public read"  on storage.objects;
drop policy if exists "previews: owner write"  on storage.objects;
drop policy if exists "previews: owner update" on storage.objects;
drop policy if exists "previews: owner delete" on storage.objects;

create policy "previews: public read" on storage.objects for select
  using (bucket_id = 'invitation-previews');

-- files are stored as <user id>/<invitation id>.jpg, so the first folder must be the signed-in user
create policy "previews: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "previews: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "previews: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Lightweight lookup for the link-preview function ---------------------------------------------
-- get_public_invitation() also increments views, so crawlers must not call it.
create or replace function public.get_invitation_meta(p_slug text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'groom_name', groom_name, 'bride_name', bride_name, 'event_date', event_date,
    'seo_title', details->>'seoTitle', 'seo_description', details->>'seoDescription',
    'seo_image', details->>'seoImage', 'venue', details->>'venueEn')
  from public.invitations
  where lower(slug) = lower(p_slug) and published and deleted_at is null
  limit 1;
$$;
revoke all on function public.get_invitation_meta(text) from public;
grant execute on function public.get_invitation_meta(text) to anon, authenticated;

-- 3. Block bad and reserved link names in the database too ----------------------------------------
-- Keep this list in sync with src/lib/reserved.ts.
-- The format check ignores case (old links could contain capitals) and allows slug = id
-- because an invitation without a custom link uses its own id (a 36 character uuid) as the slug.
alter table public.invitations drop constraint if exists invitations_slug_format;
alter table public.invitations drop constraint if exists invitations_slug_reserved;

alter table public.invitations
  add constraint invitations_slug_format
    check (lower(slug) ~ '^[a-z0-9_-]{3,30}$' or slug = id),
  add constraint invitations_slug_reserved
    check (lower(slug) <> all (array[
      'login','invitations','templates','create','inventory','billing','customize',
      'dashboard','api','assets','i','admin','privacy','terms','pricing','about','contact',
      'favicon','robots','sitemap']));
