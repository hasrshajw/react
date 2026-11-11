# Schedy – Task List (QA & Security Remediation)

Source: QA & Security Audit Report, 11 Nov 2026 (audited commit `c29cd97`, verified against `preview` HEAD `2148f02`).
Replaces all previous tasks. Finding IDs (C-, H-, M-, L-) refer to that report.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **Owner** column is for you to fill in.

> Ground rule: tasks in Phase 0 and 1 are security fixes and come before any new feature work.
> The **Client Self-Service Editing** feature (Track B, below) depends on C-1, C-2, C-3 and H-2 and must not ship before them.

---

## Phase 0 – Now (hours, ~0.5–1 day)

| Done | ID | Task | Where | Acceptance check |
| --- | --- | --- | --- | --- |
| [ ] | – | Rotate any GitHub / Supabase token that was pasted in chat, email or tickets. Use short-lived, repo-scoped tokens only | GitHub settings, Supabase dashboard | Old tokens show as revoked |
| [ ] | C-1 | **Supabase dashboard:** disable public sign-ups (Auth → Providers → Email), and restrict or disable Google sign-in until the admin role exists. *Temporary: Track B re-opens sign-up only after B1 (admin role + least-privilege RLS) is live* | Supabase dashboard | A new email cannot register; Google login by a stranger is blocked |
| [ ] | C-2 | Add `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` (no `allow-same-origin`) to the public invitation iframe | `src/pages/PublicInvitation.tsx:37` | A template with `<script>localStorage.getItem(...)</script>` cannot read app storage |
| [ ] | C-3 | Revoke self-update on profiles: `REVOKE UPDATE ON public.profiles FROM authenticated; GRANT UPDATE (name) ON public.profiles TO authenticated;` | `supabase/schema.sql` policy `profiles: self update` (line ~121) | Console call setting `plan_status='active'` is rejected |
| [ ] | H-1 | Fix Create overwriting an existing invitation: add `key={location.search}` to the Create route, or read `edit` via `useSearchParams()` and re-run the load effect; treat a search change as navigation for the unsaved-changes blocker | `src/AdminApp.tsx:210`, `src/pages/Create.tsx:35` | Edit A → click sidebar "Create Invitation" → form is empty and Save creates a new row |

---

## Phase 1 – This sprint (~3–4 days)

### Authorization and data safety
- [ ] **C-1** Add an `is_admin` flag (or role claim) and gate the `templates`, `categories`, `enquiries` policies on it. Keep the per-owner rule on `invitations`. (`schema.sql` lines ~101–116)
  - Verify: a second non-admin account cannot update a template, write a category, or read/update enquiries.
- [ ] **C-2** `LivePreview`: remove `allow-same-origin`; update the frame via `postMessage` instead of morphdom on `contentDocument`. (`src/features/create/components/LivePreview.tsx:85`)
- [ ] **C-2** Add a Content-Security-Policy header in `vercel.json`.
- [ ] **H-2** Enforce URL, phone, length and type rules for `details` in the database (trigger or `check`).
- [ ] **H-2** In `compile()`, allow-list protocols (http, https, tel, mailto) on `href`/`src`-like attributes and strip `on*` handler attributes from templates. (`src/lib/compileInvitation.ts`)
  - Verify: `venueMaps = javascript:alert(1)` and a name containing `"><script>` render as inert text.
- [ ] **H-5** Harden enquiry inserts: route through an Edge Function with captcha and rate limit, add `check (char_length(message) <= 2000)`, and restrict insertable columns (`note`, `history`, `follow_up_date`, `status`). (`schema.sql` line ~112)
  - Verify: anon insert with `note`, 1 MB `message`, or `status='called'` is rejected.

### Setup and schema
- [ ] **H-3** Fold migrations `001` and `002` into `schema.sql` (or adopt Supabase CLI migrations): `get_invitation_meta()`, the `invitation-previews` bucket and policies, slug format and reserved-word constraints.
  - Verify: on a clean project, `x-invite-status: found` and preview image upload both work.
- [ ] **M-11** Move the `drop table … cascade` block (`schema.sql` lines 12–16) into a separate explicit `reset.sql`; make `schema.sql` idempotent. Update the README warning in "Set up Supabase".
- [ ] **README** Add "disable public sign-ups" and the admin-user setup step to Set up Supabase step 3.

### App correctness
- [ ] **H-6** Take `pub`/`deleted` flags from each refreshed row, not only on first load; send publish/trash writes serially or as one batch RPC and reconcile with the server response. (`src/features/dashboard/hooks/useInvitationStore.ts`, `src/lib/api.ts`)
  - Verify: unpublish on device 1, refresh on device 2 → status updates; rapid publish/unpublish ×10 ends in the same state on server and UI; bulk publish of 50 rows with one forced failure leaves UI and server in agreement.
- [ ] **M-8** Replace `https://example.com` with the real domain in `index.html` (lines 18, 27, 28, 38), `public/robots.txt`, `public/sitemap.xml`; inject at build time from an env var.
- [ ] **M-12** `git rm --cached .env.local`; keep only `.env.example`; enable GitHub secret scanning.

---

## Phase 2 – Next sprint (~1 week)

- [ ] **H-4** Separate view counting from `get_public_invitation` (rate-limited or deduped per visitor); return only fields the template needs; add Vercel/Supabase rate limiting; consider longer random default slugs.
- [ ] **M-5** Server-side pagination for invitations and enquiries; select only needed columns instead of `select("*")`. (`src/lib/api.ts:63,167`)
- [ ] **M-4** Storage: bucket limits (≤300 KB, `image/jpeg`); delete the object when an invitation is purged or deleted; scheduled job to clean orphans; restrict `seoImage` to the app's own bucket.
- [ ] **M-3** Generate QR codes client-side with a small library and remove `api.qrserver.com`. (`QrModal.tsx:18`, `ShareModal.tsx:35`)
- [ ] **M-1** Session hygiene: subscribe to `onAuthStateChange` (no usage exists today); on sign-out clear create-form drafts and module caches (`knownPub`/`knownDel`) and call `signOut` before navigating.
- [ ] **M-6** Wire `onEnquiryCountChange` from `AdminApp` to the sidebar badge (currently passed by `Dashboard` but never supplied); refresh enquiries by polling or Realtime.
- [ ] **M-7** Login: reset the Google button's busy state on `pageshow`; persist `from` in `redirectTo`; drop the client password-length check on login; implement "Forgot password". (`src/lib/auth.ts:48–52`, `Login.tsx`)
- [ ] **M-13** Default to `trial` (or show an explicit error) when the profile row is missing. (`src/lib/api.ts:33`, currently falls back to `"active"` and `"Pro"`)
- [ ] **M-9** `api/invite.js`: take the site URL from an env var instead of `Host`/`X-Forwarded-Host`; render the stub link only for valid slugs; align `SLUG_RE` (1–64) with the DB rule (3–30).
- [ ] **M-10** Template compiler: use `Object.create(null)` or a `Map` for values; strip only known placeholder syntax instead of every `{{…}}`; fix `PreviewPanel` fallback to the non-existent `tpl.html`.
- [ ] **M-2** Transliteration: separate "no suggestion" from network errors so one miss does not disable online mode for 60 s; decide on a documented API; disclose in the privacy policy. (`src/lib/transliterate.ts:12–37`)

---

## Phase 3 – Ongoing

### Test and tooling baseline (**M-14**, nothing exists today)
- [ ] ESLint with `react-hooks` and `@typescript-eslint`; add `npm run lint`.
- [ ] Vitest unit tests for `compile`, `validate`, `slug`, `dashboardData` helpers.
- [ ] Playwright e2e: login → create → publish → public view.
- [ ] RLS tests (pgTAP or Supabase CLI) covering the authorization checklist in the audit, section 6.
- [ ] GitHub Actions: typecheck, build, tests, `npm audit`; add Dependabot.
- [ ] Tighten types: remove `[key: string]: any` on core types, enable `noImplicitAny`, align `@types/react` (^19) with `react` (^18.3.1), pin TypeScript instead of using a caret.

### Cleanup and low-priority fixes
- [ ] **L-1** Replace `href="#"` Docs/Support links, add handlers for profile-menu items, add a catch-all route for unknown admin URLs.
- [ ] **L-2** Remove or relocate repo-root `assets/` (~4.4 MB, not shipped), `src/assets/1.html`, `src/assets/test.html`, `src/assets/txt`. (`temp/*.html` was already deleted in the last two commits.)
- [ ] **L-3** CSV formula guard: also cover values starting with tab or carriage return; tighten the `^\+?[\d\s]+$` exemption; avoid prefixing harmless text beginning with `-`.
- [ ] **L-4** `waLink`: handle 11-digit numbers with a leading 0; avoid "Hi , thanks…" when the name is empty.
- [ ] **L-5** `uid()` fallback: remove the `.` from the generated id (breaks the `/<slug>` rewrite on Vercel).
- [ ] **L-6** Merge duplicate `readJSON`/`writeJSON` in `lib/storage.ts` and `lib/dashboardData.ts`.
- [ ] **L-7** `saveEnquiry`: append to `history` server-side instead of overwriting the array.
- [ ] **L-8** Use a server timestamp for `deleted_at`; run the 30-day trash purge as a scheduled job.
- [ ] **L-9** Live preview: render the compiled document so `<head>`/`<style>` changes show; stop executing template scripts in the editor.
- [ ] Longer term: serve invitations from a separate origin or subdomain.

---

# Track B – Client self-service editing with admin approval

## B0. Goal and flow

Admin creates an invitation and records the **client's email** on it. The client signs up or logs in with that email, sees only their own invitation(s), edits them on a separate client page, and submits. The change **does not go live**: it becomes a *pending change request*, the admin is notified, reviews a diff, and approves or rejects. Approved → applied to the live invitation. Rejected → client sees "Rejected" (with the admin's note) until they acknowledge it.

```
Admin creates invitation (+ client_email)
        │
Client signs up / logs in (verified email)
        │
   ┌────┴─────────────┬──────────────────────┐
 0 linked           1 linked              2+ linked
 "No invitations    open editor           list → pick one → editor
  linked to this    directly
  account"
        │
Client edits → "Submit for review"  ──►  change_request (pending) ──► notify admin (in-app + email)
        │                                          │
 editor shows pending banner at top        Admin reviews diff
                                          ┌────────┴─────────┐
                                      Approve            Reject (+ note)
                                          │                  │
                         apply to invitation (transaction)   client sees "Rejected" banner
                         notify client                       until they click "Got it" (acknowledge)
```

## B1. Decisions to lock before coding (write the answer next to each)

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Column name | Use **`client_email`**, not `owner_email`. The existing `invitations.owner` is the admin's `auth.uid()` that created the row; reusing "owner" would be confusing and dangerous in RLS. |
| D2 | How the admin is identified | **Database table `admins`** (seeded from the admin email), checked by an `is_admin()` function used in RLS. `VITE_ADMIN_EMAIL` ships in the browser bundle, so it may only drive UI hints. Edge Function reads the real address from a server secret `ADMIN_EMAIL`. |
| D3 | Email trust | A client may be linked **only if their email is verified** (`email_confirmed_at` set, or Google with `email_verified`). Otherwise anyone could sign up with a victim's address and take over their invitation. |
| D4 | Sign-up model | Preferred: **invite flow** – admin clicks "Invite client", an Edge Function calls `auth.admin.inviteUserByEmail`, so public sign-up can stay closed. Fallback: open sign-up, which is safe only after B2 least-privilege RLS is deployed and verified. |
| D5 | Pending rules | **One pending request per invitation** (partial unique index). While pending, the client editor is read-only with **Withdraw** (and then re-edit). Avoids merge conflicts and request spam. |
| D6 | What a client may change | Allow-list of `details` keys (names, dates, times, venues, maps, contacts, SEO text). **Never** client-editable: `slug`, `template_id`, `published`, `deleted_at`, `client_email`, `owner`, `views`, `seoImage` unless uploads are separately secured. |
| D7 | Conflicting edits | Each request stores `base_updated_at`. If the admin edited the invitation after the client started, approval shows a conflict warning and requires an explicit choice. |
| D8 | Notification channels | In-app (badge + list, via Realtime) **and** email (Edge Function + Resend/Supabase SMTP). Email must never be the only record. |

## B2. Database (new migration, e.g. `supabase/migrations/003_client_edit.sql`; also fold into `schema.sql` per H-3)

- [ ] **Admin role:** `create table admins (user_id uuid primary key references auth.users, email citext unique, created_at)`; `create function is_admin() returns boolean security definer` (stable, `search_path` pinned). Seed with the admin email. *(This is the C-1 fix, reused here.)*
- [ ] **Client link:** `alter table invitations add column client_email citext;` with `check (client_email is null or client_email = lower(btrim(client_email)))`, format check, and index `invitations_client_email_idx`.
- [ ] **Helper:** `current_user_email()` returns `lower(auth.jwt()->>'email')` only when the JWT email is verified.
- [ ] **RLS on invitations** (keep the existing admin/owner rules, add):
  - client **SELECT** where `client_email = current_user_email()` and `deleted_at is null`
  - **no** client INSERT / UPDATE / DELETE policy at all (writes only through RPCs)
  - column-level hardening: expose a view `client_invitations` with only safe columns (no `views`, `owner`, `slug` internals as needed)
- [ ] **Table `change_requests`:** `id uuid pk`, `invitation_id text fk`, `requested_by uuid`, `client_email`, `base_updated_at timestamptz`, `proposed_details jsonb`, `changed_keys text[]`, `status` check in (`pending`,`approved`,`rejected`,`withdrawn`,`superseded`), `admin_note text`, `reviewed_by uuid`, `reviewed_at`, `acknowledged_at` (client dismissed the rejection), `created_at`.
  - partial unique index `(invitation_id) where status='pending'` (D5)
  - RLS: client SELECT own (`requested_by = auth.uid()`), admin SELECT all; **no direct writes** by anyone.
  - cap `pg_column_size(proposed_details)` (e.g. ≤ 64 KB) and reject base64 blobs.
- [ ] **Table `notifications`:** `id`, `recipient_user_id` or `audience='admin'`, `type`, `payload jsonb`, `read_at`, `created_at`; RLS: recipient reads/updates own `read_at` only; add to Realtime publication.
- [ ] **Table `audit_log`** (append-only): who, what, invitation, before/after hash, timestamp. No update/delete policies.
- [ ] **RPC `submit_change_request(invitation_id, details jsonb)`** `security definer`:
  1. caller's verified email = `invitations.client_email`; invitation not deleted
  2. strip to allow-list (D6) and validate with the same rules as H-2 (URL protocols, phone, lengths, types)
  3. reject if nothing changed; reject if a pending request exists (or supersede, per D5)
  4. rate limit (e.g. 10 submissions/hour/user)
  5. insert request, insert admin notification, return the request
- [ ] **RPC `withdraw_change_request(id)`**: requester only, pending only.
- [ ] **RPC `review_change_request(id, decision, note)`**: `is_admin()` only. In one transaction: lock request + invitation (`FOR UPDATE`), check `base_updated_at` (D7), on approve merge allow-listed keys into `details` and refresh `groom_name`/`bride_name`/`event_date`, mark request, write audit row, notify client.
- [ ] **RPC `acknowledge_rejection(id)`**: requester only; sets `acknowledged_at`.
- [ ] **RPC `my_invitations()`**: returns the caller's linked invitations plus the latest request status per invitation (drives the list screen and the badge).
- [ ] **Link management:** when the admin changes or clears `client_email`, pending requests are marked `superseded` and the old client loses access immediately (RLS is evaluated per request, so no cleanup job is needed).
- [ ] **Signup trigger:** extend `handle_new_user()` so new users get **no** admin role (explicit `role = 'client'` in `profiles`, never `'Administrator'` by default). Today the default is `'Administrator'`, which must change.

## B3. Server side (Edge Functions / Vercel)

- [ ] **`notify-admin`** (Supabase Database Webhook on `change_requests` insert → Edge Function): sends an email to server secret `ADMIN_EMAIL` with client, invitation, changed fields and a deep link to the review page. Idempotent (dedupe by request id).
- [ ] **`notify-client`** (on status change): email the client on approved / rejected (with note).
- [ ] **`invite-client`** (admin only, verifies `is_admin()`): sends the Supabase invite for D4; never exposes the service-role key to the browser.
- [ ] Secrets: `ADMIN_EMAIL`, mail-provider key stored in Supabase/Vercel secrets only. Add a `.env.example` note.
- [ ] Failure handling: if email fails, the in-app notification still exists; log and retry with backoff.

## B4. Frontend – shared groundwork

- [ ] **Env:** `VITE_ADMIN_EMAIL=test@gmail.com` added to `.env.local` (done) and a placeholder to `.env.example` (done). Read it through `src/lib/config.ts`; **use for display only** (e.g. "Contact admin"), never for route or permission decisions.
- [ ] **Role resolution:** `useRole()` calls `is_admin()` once after login and caches in memory (not in a trusted localStorage flag). Returns `admin | client | none`.
- [ ] **Post-login routing** (`Login.tsx`, `lib/auth.ts`): admin → `/dashboard` (existing), client → `/my`. Preserve `from` through the OAuth redirect (this also fixes M-7).
- [ ] **Routing:** add a separate lazy-loaded **`ClientApp`** chunk (same pattern as `AdminApp` in `src/App.tsx`) so clients never download admin code and admins' bundle stays small. Add `my` (and any sub-path words) to `RESERVED` in `src/lib/reserved.ts`, the DB reserved list, and `vercel.json`, per the "keep in sync" rule.
- [ ] **Guards:** `AdminApp` redirects non-admins to `/my`; `ClientApp` redirects admins to `/dashboard` and anonymous users to `/login`. Real enforcement is RLS; guards are UX.
- [ ] **Session:** implement `onAuthStateChange` (M-1) first, since client accounts are on shared devices more often; clear drafts and caches on sign-out.
- [ ] **API layer:** add to `src/lib/api.ts`: `fetchMyInvitations`, `submitChangeRequest`, `withdrawChangeRequest`, `acknowledgeRejection`, `fetchReviewQueue`, `reviewChangeRequest`, `fetchNotifications`, `markNotificationRead`.

## B5. Frontend – admin side

- [ ] **Create / Edit form:** add **"Client email"** field (section "Client access"), optional, trimmed + lower-cased, validated with `isEmail`; add `clientEmail` to `InvitationData`, `formReducer`, `validate.ts`, `saveInvitation`/`fetchInvitations`. Show a warning when the email is changed ("the previous client loses access and any pending request is cancelled").
- [ ] **Invite action:** "Send invite to client" button next to the field (D4), with sent/accepted status.
- [ ] **Invitations list:** column/filter for client email and a "Pending review" chip.
- [ ] **Review queue page** (`/reviews`, add to `RESERVED`): list by status with pending count badge in the sidebar (reuse the unused `onEnquiryCountChange` pattern from M-6, via a shared context).
- [ ] **Review detail:** field-by-field **diff** (current vs proposed, using `changed_keys`), sandboxed live preview of the proposed version (no `allow-same-origin`, per C-2), conflict warning (D7), **Approve** / **Reject** with a required note on reject, and confirmation dialogs.
- [ ] **Notification bell:** unread count via Realtime, list with deep links.

## B6. Frontend – client side

- [ ] **`/my` landing logic** (three cases, in this order):
  - 0 linked → empty state: "No invitations are linked to this account", showing the signed-in email and a "Contact admin" link (`VITE_ADMIN_EMAIL`).
  - 1 linked → redirect straight to `/my/invitations/:id`.
  - 2+ linked → list (couple names, date, status chip: *Live / Pending review / Rejected / Up to date*) → click opens the editor.
- [ ] **Client editor** (`/my/invitations/:id`): reuse `CreateForm` + `formReducer` + `LivePreview` in a **restricted mode** (props `mode="client"` with an allow-list that hides template picker, slug, publish and trash controls and disables nothing silently: hidden fields are simply not rendered).
- [ ] **Pending banner at the top of the editor** when a request is pending: "Your changes are waiting for admin review, submitted <time>", with **View submitted changes**, **Withdraw**. Form is read-only showing the *proposed* values (D5).
- [ ] **Rejected banner** until acknowledged: shows the admin's note, **Edit again** (prefills from the rejected values) and **Got it** (calls `acknowledge_rejection`). Banner survives reloads and devices because state is server-side.
- [ ] **Approved:** toast / banner once ("Your changes are live"), then clears.
- [ ] **Submit button:** label "Submit for review"; disabled when there are no changes; confirm dialog explaining that changes go live only after approval; keep the unsaved-changes blocker and draft autosave, but scope the draft key per user and invitation (and clear on sign-out, M-1).
- [ ] Never call the admin `saveInvitation` path from `ClientApp`; the client editor submits through `submitChangeRequest` only.
- [ ] Mobile-first layout (clients will mostly use phones); skeleton loading per the README rules.

## B7. Edge cases to handle explicitly

- [ ] Email normalisation: case, surrounding spaces; decide whether `+tag` addresses match (recommendation: exact match, no stripping).
- [ ] Client signs up with a different email than the one linked (e.g. Gmail vs. work) → sees the "none linked" state with the signed-in email displayed so they can tell the admin.
- [ ] Unverified email → show "Verify your email to see your invitations"; no data returned (RLS enforces).
- [ ] Invitation trashed, unpublished or deleted while a request is pending → request marked `superseded`, client notified.
- [ ] Admin edits the invitation while a request is pending → conflict path (D7).
- [ ] Double-click / two tabs submitting → unique index + idempotent RPC.
- [ ] Same client email on many invitations; the list must paginate beyond the PostgREST 1,000-row cap (M-5).
- [ ] A user is both admin and linked client → role `admin` wins; provide "view as client" only if needed later.
- [ ] Rejected request pile-up: keep history, show only the latest unacknowledged one in the banner.
- [ ] Data minimisation: client queries never return other invitations, enquiries, templates' other data, `views`, or other clients' emails.

## B8. Security checklist (must pass before release)

- [ ] Client A cannot read, edit or submit for client B's invitation (direct REST, RPC, and by guessing ids/slugs).
- [ ] Client cannot write `invitations`, `change_requests`, `admins`, `profiles.role`, `notifications` of others (anon key + own JWT).
- [ ] Client cannot self-promote to admin by any route (sign-up metadata, profile update, RPC parameters).
- [ ] Non-admin cannot call `review_change_request`, `invite-client`; calling with a forged `decision` or someone else's request id fails.
- [ ] Proposed `details` with `javascript:` URLs, `<script>`, oversized payload, extra keys outside the allow-list are rejected server-side.
- [ ] Unverified-email sign-up cannot see a linked invitation.
- [ ] `VITE_ADMIN_EMAIL` change in the browser (devtools) grants nothing.
- [ ] Rate limits hold (submit, invite, notification emails).
- [ ] Emails contain no secrets and use signed deep links only to pages that re-check auth.

## B9. Test plan

- [ ] **RLS / RPC tests** (pgTAP or Supabase CLI): the matrix in B8 with three personas (admin, client A, client B) plus anon.
- [ ] **Unit (Vitest):** allow-list stripping, diff generation (`changed_keys`), email normalisation, three-case landing logic, banner state machine (none → pending → approved / rejected → acknowledged).
- [ ] **E2E (Playwright):** admin creates invitation with client email → client signs up → edits → admin receives notification → approves → public page shows new data; same flow with reject → client sees rejected until "Got it"; 0-linked and multi-linked accounts; withdraw; conflict path.
- [ ] **Email:** test with a sandbox mail provider; verify deduplication and failure fallback to in-app notification.

## B10. Delivery milestones (each shippable on its own, behind `preview` first)

| Milestone | Scope | Depends on | Exit criteria |
| --- | --- | --- | --- |
| **B-M0** | Decisions D1–D8 recorded; Phase 0 and Phase 1 security items (C-1, C-2, C-3, H-2) done | – | Authorization tests from audit §6 pass |
| **B-M1** | B2 migration: `admins`, `client_email`, `change_requests`, `notifications`, `audit_log`, RPCs, RLS; DB tests | B-M0 | RLS test matrix green on a clean project |
| **B-M2** | B5 "Client email" field + invite action; admin list column | B-M1 | Client email saved, normalised and shown |
| **B-M3** | B4 role resolution, post-login routing, `ClientApp` shell, 0/1/many landing | B-M1 | Each of the 3 cases verified with test accounts |
| **B-M4** | B6 restricted editor, submit, pending and rejected banners | B-M3 | Submit creates a pending request; live data unchanged |
| **B-M5** | B5 review queue, diff, approve/reject, conflict handling | B-M4 | Approve updates live page; reject keeps live data |
| **B-M6** | B3 Edge Functions, notification bell, emails | B-M5 | Admin notified within a minute; client notified on decision |
| **B-M7** | B7 edge cases, B8 checklist, B9 e2e, docs (README sections "Roles", "Client editing", sign-up setting) | B-M6 | All checklists green; promote `preview` → `main` |

---

## Definition of done for the release

- [ ] All Critical and High items closed and verified with a second normal account plus the anon key.
- [ ] Attack chain from the audit (sign up → edit template → script runs for admin) no longer works at steps 1, 2 and 3.
- [ ] `npm run typecheck`, `npm run build`, lint and tests all green in CI.
- [ ] `schema.sql` on a fresh Supabase project produces a fully working app (previews, uploads, slug rules).
- [ ] Track B checklist (B8) fully green, including a client-versus-client isolation test.
