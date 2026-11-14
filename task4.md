# Task 4 – Client area reads one invitation in full, not all of them

**Date:** 15 Nov 2026 · **Branch:** `preview`

## Problem
The client shell (`ClientShell`) read `my_invitations()` for the whole area: every linked invitation with its full `details`
and the full proposed details of its latest change request (up to 500 rows). The Dashboard and the editor then used only the
one invitation on screen. Every `reload()` (after a submit, withdraw or "Got it") read all of it again.

## What was done
1. **Database (run once):** `supabase/migrations/020_my_invitations_light.sql` (also appended to `schema.sql`), same access rule as `my_invitations()`
   (verified email only, not trashed):
   - `my_invitations_list()`: every linked invitation **without** `details` and without proposed details (only the link ID as `custom_id`).
   - `my_invitation(p_id)`: one invitation with everything `my_invitations()` returns.
2. **Data layer (`src/lib/api.ts`):** `fetchMyInvitationList()` (light rows, marked `listOnly`; falls back to the old full read, `complete: true`,
   if the new function is not installed yet) and `fetchMyInvitation(id)` (one full row, `null` if not theirs / gone). `fetchMyInvitations` is unchanged.
3. **`ClientShell`:** reads the light list, plus the full row of the invitation on screen (the route id, else the picked one, else the newest).
   - A reload reads the list **and** that one row together, so the screen swaps both at once (no flicker).
   - Picking another invitation, or opening `/my/<other id>`, reads just that one.
   - Consumers (`ClientDashboard`, `ClientEditor`) get the same `list`, with the on-screen row swapped for its full copy, so they needed **no change**.
     The list is withheld (loading) until that row is complete, so a form is never built from an incomplete row.
   - If the full read fails: the existing "couldn't load / Try again" message. If the invitation is not theirs or gone: it is left out of the list.
4. Bug found and fixed while testing: a failed full read inside the reload was not caught (it sat in the success handler); it is now.

## Tests
- `ClientApp.test.tsx`: 4 new tests (only the on-screen invitation read in full, picking another reads that one, failed full read shows
  the message and no form, complete fallback list needs no second read). Existing client tests moved to the new list function.
- `ClientApp.editor.test.tsx`: mocks moved to the new list function.
- `api.test.ts`: light list + one full row, fallback to the full read, `null` for a row that is not theirs.
- `tsc` clean, build passes, full suite **640 passed**.

## Before deploying
Run `supabase/migrations/020_my_invitations_light.sql` in Supabase > SQL Editor. Until then the client area reads everything as before.

## Left for the next tasks
1. **Preview image storage** (last item): not yet checked how it is stored. Next step is to read `uploadSeoImage`/storage code in `src/lib/api.ts` and the `invitation_images` bucket policies, then report before changing anything.
