# Release checklist (Track B → `main`)

Owner steps that cannot be finished from code alone. Run these on a real Supabase project and the `preview` Vercel deployment before promoting to `main`.

## 1. Secrets and Phase 0

- [ ] Revoke any GitHub fine-grained token that was pasted into chat.
- [ ] Confirm Supabase Auth: email confirmations on; disable public sign-up if only invitees should join (or keep open if intentional).
- [ ] Vercel env: `VITE_*` publishable only; `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `WEBHOOK_SECRET`, `ADMIN_EMAIL` server-only.

## 2. Apply schema

- [ ] Run `supabase/01_schema.sql`, then optionally `02_seed_templates.sql`, on a clean project.
- [ ] Run `supabase/03_make_admin.sql` (with your email) to make your user an admin.
- [ ] **Existing live project** (set up before T1–T8): run `supabase/updates/01_T1_parent_status.sql` through `08_T8_relatives.sql` in order (safe to re-run). Then **Admin → Templates**: re-paste `docs/templates/telugu-traditional.html` into the Telugu template.
- [ ] Smoke: login, create invitation, publish, open public slug, client `/my` flow.

## 3. CI

Workflow: `.github/workflows/ci.yml` (typecheck, lint, unit tests, build, `test:db`).

- [ ] Confirm the latest `preview` push is green on GitHub Actions.
- [ ] If the workflow never ran, check the Actions tab and the token’s `workflow` permission.

## 4. Security re-check (second account + anon)

- [ ] Second non-admin account cannot see or edit another user’s invitations (direct REST + UI).
- [ ] Anon key: no read of `templates` / `enquiries` / other people’s rows.
- [ ] Client A vs client B isolation on linked invitations (matches `npm run test:db` matrix).

## 5. Email (optional but recommended)

- [ ] Point Supabase webhooks at `/api/notify-admin` and `/api/notify-client`.
- [ ] Approve/reject a request and confirm the client email (or at least HTTP 200 + in-app notification).

## 6. Playwright (optional)

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

## 7. Promote

- [ ] All items above acceptable.
- [ ] Merge or promote `preview` → `main`.

### Deferred (not blocking)

- Serve public invitations from a separate origin/subdomain (longer-term hardening).
- Enforce the full CSP (currently report-only for the strict policy); review console after enabling.
