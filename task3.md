# Task 3 – Auto refresh no longer re-reads the whole list

**Date:** 14 Nov 2026 · **Branch:** `preview`

## Problem
After a search, filter or sort had loaded every invitation, the Dashboard's **Auto** toggle ran `load(true)` every minute,
which re-read the whole list (up to `LIST_LIMIT` rows) even when nothing had changed.

## What was done
1. **Database (run once):** `supabase/migrations/019_invitation_fingerprint.sql` adds `invitation_fingerprint()` (admin only).
   It returns one short text: `count | newest updated_at | total views`. `updated_at` moves on every edit, publish and trash
   change; a view-count change alone does not (see `invitations_touch`), so the views total is part of the text. Also appended to `supabase/schema.sql`.
2. **Data layer (`src/lib/api.ts`):** `fetchInvitationFingerprint()` reads it. It returns `null` if it cannot be read
   (function not installed yet, offline), instead of throwing.
3. **`useInvitationStore`:** new `refreshIfChanged()`:
   - Only the first few rows loaded (limit not raised): reads the list as before (5 rows is as small as the check).
   - Everything loaded: reads the fingerprint; same as last time = **no list read**; different = reads the list.
   - Fingerprint `null` = reads the list as before (safe fallback).
   - The fingerprint is stored before the read, so a change that lands during the read is caught next minute.
     A failed read clears it, so the next check tries again.
4. **`Dashboard`:** the Auto interval calls `refreshIfChanged` instead of `load(true)`. The Refresh button still always reads the list.

## Tests
- `useInvitationStore.test.tsx`: 5 new tests (small list, unchanged = no read, changed = read, `null` fallback, retry after a failed read).
- `api.test.ts`: fingerprint read and `null` on error.
- `tsc` clean, build passes, full suite **633 passed**. (`npm run lint` could not be run here: the repo's ESLint config is not in the format this environment's ESLint expects. Please run it locally.)

## Before deploying
Run `supabase/migrations/019_invitation_fingerprint.sql` in Supabase > SQL Editor. Until then Auto refresh behaves as before (full read).

## Left for the next tasks
1. **Client area reads** (next): client dashboard and editor read the client's full invitation data via `my_invitations`.
2. **Preview image storage:** not yet checked how it is stored.
3. Note: the first-open role check calls `is_admin`, not `my_invitations` (earlier statement corrected). Nothing to fix there.
