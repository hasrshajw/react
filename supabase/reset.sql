-- Schedy: RESET. Run in Supabase dashboard > SQL Editor, only when you really want to start over.
--
-- !!! WARNING: THIS SCRIPT DELETES ALL PROJECT TABLES AND THEIR DATA. IT CANNOT BE UNDONE. !!!
-- It wipes: categories, templates, invitations, enquiries, profiles, plus the policies, triggers and functions
-- that supabase/schema.sql creates.
-- It does NOT delete: login users (auth.users), or the "invitation-previews" storage bucket and the image files in it
-- (Supabase does not allow deleting buckets with SQL; empty and delete it in Storage if you want it gone).
--
-- To rebuild a clean project afterwards, run in this order:
--   1. supabase/reset.sql   (this file)
--   2. supabase/schema.sql
--   3. supabase/seed.sql    (optional starter templates)
--
-- schema.sql on its own is safe to re-run and never deletes data. Do not run this file on a live site.

-- triggers and functions that hang off auth.users or are called from the app
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_public_invitation(text) cascade;
drop function if exists public.get_invitation_meta(text) cascade;
drop function if exists public.record_invitation_view(text, text) cascade;

-- tables (dropping a table also drops its policies and triggers)
drop table    if exists public.notifications cascade;
drop table    if exists public.audit_log cascade;
drop table    if exists public.change_requests cascade;
drop table    if exists public.invitation_view_seen cascade;
drop table    if exists public.invitation_view_rate cascade;
drop table    if exists public.invitations cascade;
drop table    if exists public.templates   cascade;
drop table    if exists public.categories  cascade;
drop table    if exists public.enquiries   cascade;
drop table    if exists public.profiles    cascade;
drop table    if exists public.admins      cascade;

-- helper functions
drop function if exists public.submit_change_request(text, jsonb, timestamptz) cascade;
drop function if exists public.withdraw_change_request(uuid) cascade;
drop function if exists public.review_change_request(uuid, text, text, boolean) cascade;
drop function if exists public.acknowledge_rejection(uuid) cascade;
drop function if exists public.client_template_html(text) cascade;
drop function if exists public.admins_set_label() cascade;
drop function if exists public.my_invitations() cascade;
drop function if exists public.current_user_email() cascade;
drop function if exists public.details_value(jsonb, text) cascade;
drop function if exists public.invitations_supersede_requests() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.invitations_check_details() cascade;
drop function if exists public.details_is_valid(jsonb) cascade;
drop function if exists public.details_problem(jsonb) cascade;
drop function if exists public.is_safe_url(text) cascade;
drop function if exists public.enquiries_check_insert() cascade;
drop function if exists public.enquiries_history() cascade;
drop function if exists public.touch_updated_at() cascade;
drop function if exists public.invitations_touch() cascade;
drop function if exists public.invitations_trash_stamp() cascade;
drop function if exists public.expired_trash_ids() cascade;
drop function if exists public.purge_expired_trash() cascade;
drop function if exists public.trash_retention() cascade;

-- the daily trash purge job (only if pg_cron is installed)
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule('purge-expired-trash');
  end if;
exception when others then null;
end $$;

-- storage policies for link-preview images (the bucket itself is kept, see above)
drop policy if exists "previews: public read"  on storage.objects;
drop policy if exists "previews: owner write"  on storage.objects;
drop policy if exists "previews: owner update" on storage.objects;
drop policy if exists "previews: owner delete" on storage.objects;
