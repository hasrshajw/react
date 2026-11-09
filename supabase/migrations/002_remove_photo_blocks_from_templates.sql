-- 002_remove_photo_blocks_from_templates.sql
-- Run in Supabase > SQL Editor after the Photos section was removed from the app.
-- Safe to run more than once. It only touches rows in public.templates that still contain photo markup.
--
-- The Create page no longer fills {{couple-photo}} or {{gallery-1..4}}. The starter templates wrapped them in
-- {{#if ...}} blocks, so they already render nothing, but the dead markup and CSS are removed here.
-- (supabase/seed.sql was cleaned the same way for fresh setups. Its inserts use "on conflict do nothing",
--  so it never updates templates that already exist. That is why this file is needed.)

update public.templates
set html_code =
  regexp_replace(
    regexp_replace(
      regexp_replace(
        html_code,
        '<div class="gal">.*?</div>', '', 'g'),                                   -- gallery wrapper
      '\{\{#if couple-photo\}\}.*?\{\{/if\}\}', '', 'g'),                         -- couple photo block
    '\.(?:couple|gal)(?::empty)?(?: img)?\{[^}]*\}', '', 'g')                     -- their CSS rules
where html_code ~ 'couple-photo|gallery-|class="gal"';

-- Check: templates that still use the removed tokens outside the patterns above (custom templates).
-- Edit these by hand, otherwise an <img src="{{couple-photo}}"> shows as a broken image.
select id, name from public.templates where html_code ~ 'couple-photo|gallery-';
