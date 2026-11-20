# Schedy

Admin app for creating digital wedding invitations and sharing them as public links.  
All data and authentication run through Supabase.

## Quick start (local)

```bash
cp .env.example .env.local
# fill VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

npm install
npm run dev
```

Without the two Supabase variables the app only shows a setup message.

## Deploy

- `main` → production on Vercel
- `preview` → Vercel Preview deployments

Set the same environment variables (see `.env.example`) for both Production and Preview.

## Production readiness

Create-form work is complete. Remaining production-readiness tasks are tracked in `task.md`.  
Before promoting `preview` → `main`, follow `docs/RELEASE_CHECKLIST.md`.

**Security:** If any personal access token or secret was ever pasted into a chat, revoke it immediately.

## Code layout

```
src/
  features/create/     Create form, reducer, components, styles
  features/client/     Client area (/my)
  components/          Shared UI (Sidebar, BottomSheet, Skeleton, …)
  lib/                 Pure helpers (api, validate, image, storage, …)
  pages/               Route shells
setup/                 ← Supabase schema, seeds, templates & setup guide
docs/                  Release checklist, SEO notes
```

## Set up a new Supabase project

**Everything lives in the `setup/` folder.**  
See the detailed guide: **[setup/SETUP.md](setup/SETUP.md)**

### Short version

1. Create a Supabase project.
2. SQL Editor → run in order:
   - `setup/sql/01_schema.sql` (or the one-file `00_master_fresh.sql`)
   - (optional) `setup/sql/02_seed_templates.sql`
3. Authentication → Users → Add user (email + password, **Auto Confirm**).
4. Edit the email in `setup/sql/03_make_admin.sql` and run it.
5. (Recommended) Later in the admin UI paste `setup/templates/telugu-traditional.html` into a Telugu traditional template.
6. Put `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and in Vercel.

### Existing projects

If the project was created before the Create-form features, run the files in `setup/sql/updates/` in order, then re-paste the Telugu template.

### First admin

Admin rights come **only** from a row in `public.admins`.  
The only supported way is running `03_make_admin.sql` after the user exists.  
`VITE_ADMIN_EMAIL` is display-only.

## Key behaviours

- Public invitations are served at `/i/<slug>` (or short root path) with no login.
- Views are counted once per visitor per day (capped).
- Preview images live in the public `invitation-previews` bucket (JPEG ≤ 300 KB).
- Trash is retained 30 days; a daily job (pg_cron) purges expired rows.
- Public enquiries are rate-limited to 3 per phone/email per hour.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Database test suite |
| `npm run test:e2e` | Playwright smoke |
| `npm run lint` | ESLint (via tools/lint) |

CI runs on every push/PR to `preview` and `main`.

## Environment variables

See `.env.example`. Never put the service-role key in any `VITE_*` variable.
