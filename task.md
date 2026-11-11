# Schedy – Task List (QA & Security Remediation)

Source: QA & Security Audit Report, 11 Nov 2026 (audited commit `c29cd97`, verified against `preview` HEAD `2148f02`).
Replaces all previous tasks. Finding IDs (C-, H-, M-, L-) refer to that report.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **Owner** column is for you to fill in.

> Ground rule: tasks in Phase 0 and 1 are security fixes and come before any new feature work.

---

## Phase 0 – Now (hours, ~0.5–1 day)

| Done | ID | Task | Where | Acceptance check |
| --- | --- | --- | --- | --- |
| [ ] | – | Rotate any GitHub / Supabase token that was pasted in chat, email or tickets. Use short-lived, repo-scoped tokens only | GitHub settings, Supabase dashboard | Old tokens show as revoked |
| [ ] | C-1 | **Supabase dashboard:** disable public sign-ups (Auth → Providers → Email), and restrict or disable Google sign-in until the admin role exists | Supabase dashboard | A new email cannot register; Google login by a stranger is blocked |
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

## Definition of done for the release

- [ ] All Critical and High items closed and verified with a second normal account plus the anon key.
- [ ] Attack chain from the audit (sign up → edit template → script runs for admin) no longer works at steps 1, 2 and 3.
- [ ] `npm run typecheck`, `npm run build`, lint and tests all green in CI.
- [ ] `schema.sql` on a fresh Supabase project produces a fully working app (previews, uploads, slug rules).
