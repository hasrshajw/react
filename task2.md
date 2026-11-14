# Task 2 – Invitation rows no longer carry their full `details`

**Date:** 14 Nov 2026 · **Branch:** `preview`

## Problem
Every invitation row in the admin lists carried its whole `details` (every field, event, contact and text of the invitation).
That is fine for 5 or 10 rows, but a search, filter or sort loads **every** invitation, and each one dragged its full data along,
although the lists only need the link ID (`customId`) out of it.

## What was done
1. **Small list read (`src/lib/api.ts`):** new `INVITATION_LIST_COLUMNS` replaces `details` with `customId:details->>customId`
   (PostgREST reads that one value out of the JSON on the server). Used by `fetchInvitations` (Dashboard and All invitations)
   and `fetchInvitationsByIds` (Review queue names). No database change is needed.
2. **Row shape:** `splitRow` rebuilds `details: { customId }` for those rows and marks them `listOnly: true`
   (type `InvitationRow.listOnly`), so links, QR, copy link and the duplicate-link check in Share keep working unchanged.
3. **Full read only when needed (`fetchInvitation(id)`, one row):**
   - **Preview panel** reads the full invitation for the one being previewed; shows "Loading preview…", and "Couldn't load the preview" on failure. It never builds a preview from the incomplete row.
   - **Duplicate** and **Edit link** (All invitations) read the full row first, then save. Failure to read shows the existing error messages and saves nothing.
   - The editor (`Create`) and the review detail already read the full row.
4. **Safety guard:** `saveInvitation` refuses a `listOnly` row (it would overwrite the real details with just the link ID).
   A future change that saves straight from a list row fails loudly instead of losing data.
5. `fetchInvitation`, `saveInvitation` results and the client area (`my_invitations`) are unchanged (client area is a later task).

## Tests
- `api.test.ts`: lists read `customId` not `details`; row with no link gets empty details; Review names use the small columns; one invitation still reads full `details`; a list row cannot be saved.
- `PreviewPanel.test.tsx` (new): full read for a list row, nothing built while loading, failure message, complete rows used as they are.
- `Invitations.test.tsx`: Duplicate copies the **full** details (not just the link ID) and fails safely when the full read fails.
- `tsc` clean, no new lint warnings, build passes, full suite **627 passed**.

## Before deploying
Nothing to run in the database.

## Left for the next tasks
~~Auto refresh after a search~~ (done, task3.md). Still open: client area reads, preview image storage.
