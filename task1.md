# Task 1 – Enquiries first load

**Date:** 14 Nov 2026 · **Branch:** `preview`

## Problem
Opening the Dashboard read **every enquiry with its full status history** (`fetchEnquiries`, pages of 500), only to show a few
numbers (new / follow-up / total, "waiting over 24h", "follow-ups due") and to fill a side panel that is usually closed.
The 60 s refresh also asked for the whole list again whenever a fingerprint changed.

## What was done
1. **Database (run once):** `supabase/migrations/018_enquiry_summary.sql` adds `enquiry_summary(p_today)` (admin only). One small JSON answer:
   `total, new, followup, called, cancelled, stale_new, due_follow, newest_id`. Also appended to `supabase/schema.sql`.
2. **Data layer (`src/lib/api.ts`):**
   - `fetchEnquirySummary()` calls the function. If it is not installed yet, it falls back to count-only (`head`) requests, so no rows are downloaded either way.
   - `fetchEnquiryPage({ tab, search, offset, limit })`: 10 rows at a time, newest first, with one extra row to know if **More** has anything. Tab and search are done by the database (`ilike` on name, phone, email, message, note; special characters stripped).
   - `fetchEnquiries()` (everything) is now used **only by Export CSV, on click**.
   - `fetchEnquiryFingerprint` removed; the summary replaces it.
3. **`useEnquiries`:** first load = **one summary request**. Rows are read only while the panel is open (first page on open, again on tab or search change, search waits 300 ms). `loadMore()` appends the next 10 and skips duplicates. Status changes move the counts at once, undo on failure, and the exact numbers are read again when saves finish.
4. **60 s refresh / tab return:** one summary request. If it did not change, nothing else happens. If it changed: counts update, and the first page is re-read **only if the panel is open**. Same safety rules as before (skipped while hidden, while saving, and when a change happened meanwhile).
5. **UI:** `EnquiriesPanel` takes counts from the summary (tabs and title), has a **More** button, a loading line, a server-side search box (state lifted into the Dashboard) and an Export CSV that reads all rows only when clicked. `Dashboard` takes "waiting over 24h" and "follow-ups due" from the summary instead of counting loaded rows.

## Tests
- `useEnquiries.test.tsx` rewritten: first load reads no rows, panel open/tab/search reads, More, refresh rules, counts after a status change and after a failed save.
- `api.test.ts`: summary mapping, count-only fallback, page query (tab, range, extra row), search cleaning.
- `tsc` clean, lint has no new warnings, full suite **617 passed**.

## Before deploying
Run `supabase/migrations/018_enquiry_summary.sql` in Supabase > SQL Editor. Until then the fallback count requests are used (slightly more requests, still no rows).

## Left for the next tasks
Invitation rows with `details`, Auto refresh after a search, client area reads, preview image storage.
