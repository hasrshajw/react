# Task 5 – Preview image storage: checked, and kept from being re-downloaded

**Date:** 15 Nov 2026 · **Branch:** `preview`

## How it is stored (checked)
- Public bucket `invitation-previews` (created in `supabase/schema.sql`): JPEG only, 300 KB at most, public read, owner-only write/update/delete.
- One file per invitation: `<user id>/<invitation id>.jpg`, re-used on every upload (upsert). The app shrinks the picture to 1200 x 630 and under 300 KB before upload (`src/lib/image.ts`).
- The invitation stores only the public URL (`details.seoImage`, with `?v=<time>`), never the picture itself. No base64 in the database or in lists.
- The picture is shown in only one place in the app: the editor's SEO section (twice, same URL). Lists, the Dashboard and the client Dashboard do not load it.
  The public page's meta tags (`api/invite.js`) point crawlers (WhatsApp, Instagram) at the storage URL.
- Size is already well controlled. The waste was the cache time.

## Problem
Files were uploaded with `cacheControl: "3600"` (1 hour). Every browser and every crawler could download the same 300 KB file again after an hour,
although the URL changes (`?v=`) whenever the picture really changes.

## What was done
1. `uploadPreviewImage` now uploads with a one-year cache time (`PREVIEW_CACHE_SECONDS = "31536000"`). Safe because a changed picture is a new URL.
2. The two editor `<img>` tags use `loading="lazy"` and `decoding="async"`.
3. Test added (path, cache time, `?v=` URL). `tsc` clean, build passes, full suite **645 passed**.

## Notes
- Files uploaded before this change keep their old 1-hour setting until that invitation's picture is uploaded again. Nothing to run, no migration.
- Not changed on purpose: removing a picture in the editor clears the URL only; the file stays in storage (uses space, not egress).
  The orphan cleanup job is still open in M-4 (see `removePreviewImage` in `src/lib/api.ts`).

## Left for the next tasks
Nothing is left from the egress list (tasks 1 to 5 are done). Optional later: the M-4 orphan-file cleanup job.
