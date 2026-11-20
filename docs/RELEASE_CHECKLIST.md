# Release checklist (Track B → `main`)

Owner steps that cannot be finished from code alone. Run these on a real Supabase project and the `preview` Vercel deployment before promoting to `main`.

Aligned with the production-readiness plan in `task.md` (A0–A9) written 20 Nov 2026 after the full audit.

## 1. Secrets and Phase 0 (A0)

- [ ] **Revoke any GitHub fine-grained token that was pasted into chat.**
- [ ] Confirm no other secrets or tokens appear in repository history or Vercel logs.
- [ ] Confirm Supabase Auth: email confirmations on; disable public sign-up if only invitees should join (or keep open if intentional).
- [ ] Vercel env: `VITE_*` publishable only; `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `WEBHOOK_SECRET`, `ADMIN_EMAIL` (and any CRON secrets) server-only. Never put service-role or webhook secrets in `VITE_*`.

## 2. Apply schema & first admin (A2 / A4)

- [ ] Run `supabase/01_schema.sql`, then optionally `02_seed_templates.sql`, on a clean project.
- [ ] **First admin (only supported method):**
  1. Authentication → Users → Add user (email + password, Auto Confirm).
  2. Edit `supabase/03_make_admin.sql`: set `admin_email` to that exact address.
  3. Run the file in the SQL Editor. It raises an error and changes nothing if the user does not exist.
- [ ] Confirm `VITE_ADMIN_EMAIL` (if set) is used only for display links; real admin rights come only from the `admins` table + `is_admin()` RLS.
- [ ] **Existing live project** (set up before T1–T8 Create-form work): run `supabase/updates/01_T1_parent_status.sql` through `08_T8_relatives.sql` in order (safe to re-run). Then **Admin → Templates**: re-paste `docs/templates/telugu-traditional.html` into the Telugu traditional template.
- [ ] Smoke: login, create invitation, publish, open public slug, client `/my` flow.

## 3. CI

Workflow: `.github/workflows/ci.yml` (typecheck, lint, unit tests, build, `test:db`).

- [ ] Confirm the latest `preview` push is green on GitHub Actions.
- [ ] If the workflow never ran, check the Actions tab and the token’s `workflow` permission.

## 4. Security re-check (A5)

- [ ] Second non-admin account cannot see or edit another user’s invitations (direct REST + UI).
- [ ] Anon / publishable key: no read of `templates` / `enquiries` / other people’s rows.
- [ ] Client A vs client B isolation on linked invitations (matches `npm run test:db` matrix).
- [ ] Confirm `VITE_ADMIN_EMAIL` is display-only; real admin rights come only from the `admins` table + RLS.

## 5. Content-Security-Policy (A3) — done in code

- [x] Strong CSP is now **enforcing** (not only Report-Only) in `vercel.json`.
- [x] `object-src 'none'` and `frame-ancestors 'none'` are part of the enforcing policy.
- [ ] After the next preview deploy, open the browser console on `/`, `/login`, `/create`, a public invitation slug, and the live preview panel. Confirm there are no unexpected CSP violations that break the UI.
- [ ] Optionally review Report-Only reports (stricter `script-src 'self'` without `'unsafe-inline'`) for future hardening with nonces/hashes.

## 6. Email / notifications (A6)

- [ ] Point Supabase webhooks (or Edge Functions) at the notify endpoints if they exist.
- [ ] Approve/reject a change request and confirm the client email (or at least HTTP 200 + in-app notification).

## 7. Playwright & devices (A7)

```bash
npm run test:e2e:install
BASE_URL=https://your-preview.vercel.app npm run test:e2e
```

Full client matrix needs `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD`.

Phone sizes (admin mobile view, see `mobileview.md`): runs `e2e/*.phone.spec.ts` at 390x844 and 360x740.

```bash
BASE_URL=https://your-preview.vercel.app npm run test:e2e:phone
```

Admin pages need `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`; without them only the login page is checked.

- [ ] Phone runs pass: no sideways scrolling on Dashboard, Invitations, Reviews, Templates, Create.
- [ ] By hand on a real iPhone (Safari) and Android (Chrome): cards, bottom sheet (swipe down, back button), selection mode (long-press, back), notification bell.

## 8. Promote (A9)

- [ ] All Critical and High items from the audit / `task.md` acceptable.
- [ ] Final green CI on `preview`.
- [ ] Merge or promote `preview` → `main`.
- [ ] Production env vars verified and a smoke test run on the production URL.

### Deferred (not blocking)

- Serve public invitations from a separate origin/subdomain (longer-term hardening).
- Full accessibility audit and Core Web Vitals pass.
- Application-level rate limiting decisions (A8).
