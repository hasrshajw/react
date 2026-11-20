# Task plan: Production readiness (post-audit)

Branch: `preview`  
Plan written: 20 Nov 2026  
Status: **A2 done, A0 still open** (admin bootstrap documented; token revocation is owner action)

This file replaces the previous Create-form plan (T0–T9, completed). It is written so that **any person or AI can pick up the work at any point**. Read sections 1–3 first, then do the next task whose status is `TODO`.

---

## 1. Goal

Make the Schedy application production-ready for real users and real wedding data. The Create-form feature work (parent status, closing names, house names, birth order, reception venue, events, contacts, relatives) is complete. The remaining work is security hardening, operational readiness, verification, and a small set of code/docs fixes discovered in the full audit of 20 Nov 2026.

**Nothing may break existing invitations or the client (/my) flow.** All changes stay backward-compatible.

---

## 2. Audit findings (summary)

Full static audit performed on branch `preview` (React 18 + Vite 6 + TypeScript + Supabase + Vercel).

### Strengths
- Strong RLS + security-definer RPCs; public pages never load the Supabase SDK.
- Template compiler uses DOMParser + text nodes only (XSS-resistant).
- Preview runs in opaque-origin iframe + postMessage.
- Image compression, storage policies, view-rate limiting, reserved-slug list, orphan cleanup.
- Good test coverage (unit + dedicated SQL suite), CI, skeleton/empty/error states, mobile considerations.
- SEO short-link support, CSP headers, careful session handling.

### Critical / High issues
1. **Critical – Token exposure**: A fine-grained GitHub PAT was pasted into chat. Must be revoked immediately.
2. **Critical – Admin bootstrap is manual**: Who is admin is decided only by a row in `public.admins`. Bootstrap must be verified on every new project.
3. **High – Auth project settings**: Email confirmation and public sign-up policy live only in the Supabase dashboard; not enforced by code.
4. **High – Strict CSP is Report-Only**: The strong Content-Security-Policy is still report-only; only a minimal policy is enforced.
5. **High – Live verification incomplete**: Cross-user isolation, client-edit ↔ admin-review, notifications, and real-device mobile behaviour have not been confirmed on a live project with real accounts.

### Medium / Low
- No application-level rate limit on invitation creation or enquiry form (beyond what Supabase provides).
- Large components (`Sidebar.tsx`, Create form) could be split further.
- Sitemap currently contains only the root URL (acceptable for invitation-centric product).
- Email/notification webhooks are documented but not confirmed live.
- Some owner steps from the previous Create-form plan (running update SQLs + re-pasting the Telugu template) may still be outstanding on existing projects.

---

## 3. How to work on this plan

- Prefer the smallest change that moves a task to `DONE`.
- After every code change: `npm run typecheck`, `npm test`, `npm run build` (and `npm run test:db` when schema or RPCs change).
- Never commit secrets, service-role keys, or personal access tokens.
- When a task needs a live Supabase project or Vercel preview, mark the owner steps clearly and stop; do not invent credentials.
- Update the “Log” section at the bottom after finishing a task.

**Before any task that touches production data or secrets:**
- Confirm you are on branch `preview`.
- Confirm no real customer data will be modified.
- Revoke any previously pasted tokens if the task is security-related.

**After every completed task:**
- Update the status of the task to `DONE` and add a short log entry.
- If the task changed schema, compiler, or public behaviour, note the owner steps required on a live project.
- Push to `preview` so the Vercel preview and CI can run.

---

## 4. Tasks (small, ordered)

### A0 – Immediate security hygiene
**Status: TODO** (owner — cannot be completed from this environment)  
**Owner action (cannot be done from code alone)**

1. Revoke the fine-grained GitHub personal access token that was pasted into chat (GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Revoke).
2. Confirm no other tokens or secrets were committed to the repository history.
3. Rotate any other secrets that may have been exposed in the same conversation.

**Done when:** Token is revoked and a note is added to the log.  
**Before:** None.  
**After:** Proceed to A1. No code change required for A0 itself.

---

### A1 – Align documentation with audit reality
**Status: DONE** (20 Nov 2026)

Update the living documents so a new contributor or AI sees the current state:

- Rewrite `task.md` (this file) with the audit findings and the small-task list (already in progress).
- Refresh `docs/RELEASE_CHECKLIST.md` so it reflects the post-Create-form state and the new critical items (token, CSP, auth settings, verification matrix).
- Ensure `README.md` still points to the correct first steps and does not claim incomplete features are finished.

**Done when:** The three documents are consistent and a reader can start from A0 without reading the old Create-form plan.  
**Before:** A0 should be acknowledged (token revoked).  
**After:** Commit and push so the docs are visible on the preview branch.

---

### A2 – Confirm and document admin bootstrap
**Status: DONE** (20 Nov 2026)

- Verify that `supabase/03_make_admin.sql` is the only supported way to create the first admin and that it fails safely when the email does not exist.
- Add a short “First admin” section to `README.md` or the release checklist if it is missing or unclear.
- Confirm that `VITE_ADMIN_EMAIL` is used only for display (Contact admin link) and never for authorization.

**Done when:** Bootstrap steps are crystal-clear and cannot be misused.  
**Before / After:** None beyond documentation.

---

### A3 – Enforce / tighten Content-Security-Policy
**Status: TODO**

- Review the current Report-Only CSP in `vercel.json`.
- After collecting any violation reports from the preview deployment (or after a short observation period), promote the strong policy to enforcing.
- Keep the minimal hard policy (`object-src 'none'; frame-ancestors 'none'`) in place at all times.

**Done when:** The strong CSP is enforced (or a documented decision is recorded to keep it report-only for a defined period).  
**Before:** Preview deployment must be reachable so violations can be observed if desired.  
**After:** Redeploy and verify the header is present.

---

### A4 – Schema & template owner steps (existing projects)
**Status: TODO** (owner)

For any live Supabase project that was created before the T1–T8 Create-form work:

1. Run `supabase/updates/01_T1_parent_status.sql` through `08_T8_relatives.sql` in order (safe to re-run).
2. In Admin → Templates, re-paste the current `docs/templates/telugu-traditional.html` into the Telugu traditional template.
3. Smoke-test: create invitation, publish, open public slug, client `/my` edit flow.

**Done when:** All new fields appear correctly on new and existing invitations and the compiler still produces valid output for old records.  
**Before:** A0, A1.  
**After:** Note the project name / date in the log.

---

### A5 – Live security isolation matrix
**Status: TODO** (owner + optional AI assistance)

Using a real Supabase project and at least two accounts (one admin, one non-admin / client):

- Non-admin cannot read or write another user’s invitations (UI + direct REST with the anon/publishable key).
- Anon key cannot read `templates`, `enquiries`, or other people’s rows.
- Client A cannot see or edit Client B’s linked invitations.
- Confirm the results match the expectations encoded in `tools/db-test`.

**Done when:** Isolation is verified and any gap is filed as a new task.  
**Before:** A0, A4.  
**After:** Record pass/fail in the log.

---

### A6 – Notifications & email
**Status: TODO** (owner)

- Point Supabase Database Webhooks (or Edge Functions) at the notify endpoints if they exist.
- Approve / reject a change request and confirm both the in-app notification and the email (or at least HTTP 200 + in-app).
- Document the exact webhook payload and required secrets.

**Done when:** The happy path works end-to-end or a clear “email deferred” decision is recorded.  
**Before:** A0.  
**After:** Update release checklist.

---

### A7 – Playwright & real-device smoke
**Status: TODO**

- Ensure `e2e/smoke.spec.ts` and the phone projects pass against the current preview URL.
- Run the phone matrix (390×844 and 360×740) and confirm no horizontal scroll on Dashboard, Invitations, Reviews, Templates, Create.
- Manually check on a real iPhone (Safari) and Android (Chrome): bottom sheet, back button, long-press selection, notification bell.

**Done when:** Automated phone tests pass and manual notes are added.  
**Before:** Preview deployment is stable.  
**After:** Record results.

---

### A8 – Rate limiting & hardening follow-ups
**Status: TODO**

- Decide whether invitation creation and the public enquiry form need additional rate limiting (Supabase, Vercel, or application-level).
- Confirm server-side validation of uploaded preview images (or document that storage policies are considered sufficient).
- Review whether the unique constraint / index on `invitations.slug` is present and enforced.

**Done when:** Decisions are documented and any required code or SQL is merged.  
**Before:** A5 preferred.  
**After:** Update this file.

---

### A9 – Promote to main
**Status: TODO** (owner)

Only after A0–A7 (and any Critical/High items from A8) are acceptable:

- Final green CI on `preview`.
- Merge or promote `preview` → `main`.
- Verify production environment variables and a smoke test on the production URL.

**Done when:** Production is serving the audited code and the release checklist is fully ticked.

---

## 5. Deferred / backlog (do not start without owner approval)

- Serve pure public invitations from a separate origin or subdomain.
- Full accessibility audit (screen reader, keyboard-only).
- Bundle-size / Core Web Vitals measurement and optimisation pass.
- Further splitting of large components (`Sidebar`, Create form).
- RSVP, personalised guest links, .ics, gallery, music, extra languages, etc. (see previous backlog).

---

## 6. Where to find things

- This plan: `task.md`
- Release steps: `docs/RELEASE_CHECKLIST.md`
- Short-link / SEO notes: `docs/SEO_SHORT_LINK_CHANGES.md`
- Database: `supabase/01_schema.sql` (complete), `02_seed_templates.sql`, `03_make_admin.sql`, and `supabase/updates/*.sql` for incremental changes on older projects
- Create form & compiler: `src/features/create/`, `src/lib/compileInvitation.ts`, `src/lib/inviteText.ts`
- Tests: `npm test`, `npm run test:db`, `npm run test:e2e`
- Security reminder: if any token or key was ever pasted into a chat, revoke it before releasing.

---

## 7. Log

```
2026-11-20  Full production-readiness audit completed on preview branch.
            Critical finding: GitHub fine-grained PAT was exposed in chat — must be revoked (A0).
            Create-form work (T0–T9) is complete; this plan replaces the old task.md.
2026-11-20  A1 done: task.md rewritten with detailed findings + small tasks;
            docs/RELEASE_CHECKLIST.md refreshed; README.md updated (current-work
            section + fixed outdated CI path). A0 remains owner action.
2026-11-20  A2 done: Verified 03_make_admin.sql fails safely when email missing;
            confirmed VITE_ADMIN_EMAIL is display-only (mailto in ClientDashboard);
            role comes only from is_admin() RPC. Documented clear First-admin
            steps in README and RELEASE_CHECKLIST.
            Next: A0 (owner must revoke the exposed token), then A3.
```
