# Release checklist (Track B → `main`)

Owner steps that cannot be finished from code alone. Run these on a real Supabase project and the `preview` Vercel deployment before promoting to `main`.

## 1. Secrets and Phase 0

- [ ] Revoke any GitHub fine-grained token that was pasted into chat.
- [ ] Confirm Supabase Auth: email confirmations on; disable public sign-up if only invitees should join (or keep open if intentional).
- [ ] Vercel env: `VITE_*` publishable only; `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `WEBHOOK_SECRET`, `ADMIN_EMAIL` server-only.

## 2. Apply schema

- [ ] Run `supabase/schema.sql` (or migrations `001`–`015`) on a clean project.
- [ ] Insert your user into `public.admins`.
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

## 7. Promote

- [ ] All items above acceptable.
- [ ] Merge or promote `preview` → `main`.

### Deferred (not blocking)

- Serve public invitations from a separate origin/subdomain (longer-term hardening).
- Enforce the full CSP (currently report-only for the strict policy); review console after enabling.
