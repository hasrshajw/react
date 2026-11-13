# Schedy

Admin app for creating digital wedding invitations and sharing them as links. All data and login run through Supabase (see **Data layer** below).

## Run locally

Copy `.env.example` to `.env.local` and fill in your Supabase URL and publishable key first (without them the app only shows a setup message).

```bash
npm install
npm run dev
```

## Deploying

- `main` is the production branch on Vercel.
- `preview` is deployed as a Vercel Preview. Push to it to get a fresh preview URL.
- Set the same Supabase environment variables (see `.env.example`) for the Preview environment in Vercel, not only Production.

## Code layout

- `src/pages/` route components (`Create.tsx` is the page shell only)
- `src/features/create/` Create page: `formReducer.ts`, `CreateForm.tsx`, `components/`, `hooks/`, `create.css`
- `src/components/dashboard/`, `src/hooks/`, `src/lib/dashboardData.ts`, `src/styles/dashboard.css` shared Dashboard / Invitations pieces
- `src/lib/` pure helpers (`validate.ts`, `transliterate.ts`, `telugu.ts`, `image.ts`, `storage.ts`)
- `src/types/` shared TypeScript types

## Skeleton loading

Every page shows a skeleton while its server data loads (most visible in Supabase mode, where requests take real time). The rules:

- Static UI (page titles, column headers, tab labels, search box, buttons that always exist) renders immediately.
- Only server data (names, dates, counts, plan text, user name, template cards, form values) is replaced by a placeholder.
- Placeholders reuse the real element's box (`SkText` inside the real element, or the `sk-bg` ghost class), so nothing shifts when data arrives.
- Components that may not exist (e.g. "Needs attention") only get a placeholder if they were there on the last visit.
- `useRowHint` remembers how many rows the last visit had, so the skeleton has the same height as the real list.

Building blocks: `src/components/Skeleton.tsx` and `src/styles/skeleton.css`.

## Data layer (Supabase only)

All server reads and writes go through `src/lib/api.ts` (`fetchInvitations`, `saveInvitation`, `savePublished`, `saveDeleted`, `deleteInvitation`, `fetchTemplates`, `fetchEnquiries`, `saveEnquiry`, `fetchAccount`, `fetchPublicInvitation`). There is no local or demo data: nothing is stored in browser storage except small UI preferences (auto-refresh, skeleton row hints, create-form drafts) and the cached login session. Configure it with environment variables (see `.env.example`):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR-KEY
```

`VITE_SUPABASE_ANON_KEY` (the legacy anon key) still works; it is used only when the publishable key is not set.

### Set up Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql` (optional starter templates). `schema.sql` is safe to re-run: it never deletes tables or data, and it already includes everything in `supabase/migrations/` that a new project needs (preview-image bucket and its limits, link-name rules, `details` validation, enquiry insert limits, view counting, enquiry history, trash dates and purge).
   - **Starting over:** `supabase/reset.sql` is the only script that deletes data (categories, templates, invitations, enquiries, profiles; login users are kept). Run it, then `schema.sql`, then `seed.sql`. Never run it on a live site.
   - **Existing project:** you do not need to re-run `schema.sql`. Run the files in `supabase/migrations/` you have not applied yet, in numeric order (`001` to `009`; each is safe to run twice). **`005_admin_role.sql` needs one edit first:** put your sign-in email in step 1 of the file. It stops with an error, before changing any policy, if no admin is found.
3. In **Authentication**, **turn off public sign-ups first**: **Authentication → Providers → Email**, switch off "Allow new users to sign up" (in some dashboard versions it is under **Authentication → Sign In / Providers**). Templates, categories and enquiries are readable and writable only by rows in the `admins` table (task C-1), but turning sign-ups off is still the first line of defence.
   - Create the admin user by hand: **Authentication → Users → Add user → Create new user** (email + password, tick "Auto Confirm User").
   - Make that user an admin (new project: **SQL Editor**; existing project: migration `005` does this for you): `insert into public.admins (user_id, email) select id, email from auth.users where lower(email) = lower('you@example.com');`. Without this row the dashboard shows no templates, categories or enquiries. Nobody can add or read admin rows through the API; only the SQL Editor can.
   - Leave the **Google** provider off until the admin row exists, then turn it on and add `https://YOUR-DOMAIN/login` as a redirect URL. A Google login that is not in `admins` can sign in but sees no templates, categories or enquiries.
   - Profiles: a user can change only their own display `name`; `role`, `plan_name`, `plan_status` and `trial_ends_at` are edited in the dashboard (task C-3).
   - Check: the app has no sign-up form, but anyone can call the sign-up API with the public key, so test that. `curl -s -X POST "$VITE_SUPABASE_URL/auth/v1/signup" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{"email":"nobody@example.com","password":"Test-12345!"}'` must answer with an error (`signup_disabled`), and no new user may appear under **Authentication → Users**.
4. Put the three variables above in `.env.local` for local work, and in **Vercel → Project Settings → Environment Variables** for the live site, then redeploy.
   - Also set `SITE_URL` (your real domain, for example `https://your-domain.com`) for the build. It fills the canonical and social-preview tags and generates `robots.txt` and `sitemap.xml`. The link-preview function `api/invite.js` reads the same variable at runtime (it never trusts the `Host` header), so after changing `SITE_URL` redeploy. See `.env.example`.
   - Optional: `VITE_DOCS_URL` and `VITE_SUPPORT_URL` (an `https://` or `mailto:` address each) turn on the "Docs" / "Support" links in the top strip and the "Help center" / "Contact support" items in the profile menu. Without them the links are hidden and the menu items read "Soon". They are read at build time, so rebuild after changing them.

The publishable (or anon) key is meant to be public (it ships in the browser bundle); the data is protected by the row-level-security rules in `schema.sql`. Never put the `service_role` key in this project.

### Share links

Each invitation is served at `/i/<link-id>` (for example `/i/ravi-weds-priya`), with no login. The link ID is the "Custom Link ID" field, or the invitation id if it is empty. Only **published**, non-deleted invitations open; others show a "not available" page. The page is read through the `get_public_invitation` database function, so customers can never list or browse other invitations. The function only reads. A view is counted by a second call, `record_invitation_view` (task H-4, migration `007`): the browser sends a random id it keeps in its own storage, the same id counts once per invitation per day, and at most 120 views a minute are counted per invitation. A link-preview crawler does not count.

Limits to know about:

- The Photos section was removed from the Create page. Invitations saved earlier may still carry `couplePhoto` and `gallery` inside their `details` record. The app ignores them.
- "Invitation views" on the Dashboard is the real total of the per-invitation view counter: one per visitor per day (no per-day history is stored yet; a guest who clears their browser data or uses another browser counts again). RSVPs, shares and the Billing page are not built yet.
- WhatsApp link previews (title and image) need server-side tags; the page does not set them yet.

### Preview images

The link-preview picture of an invitation (the "Preview image" field) is uploaded to the public `invitation-previews` bucket as `<user id>/<invitation id>.jpg`. The rules (task M-4), all from `schema.sql` / migration `006`:

- The bucket accepts **JPEG only, at most 300 KB** per file. The app shrinks every picture to fit before uploading.
- `details.seoImage` must be empty or a file of that bucket on your own project (`https://<project>.supabase.co/storage/v1/object/public/invitation-previews/<user>/<file>.jpg`, optional `?v=<digits>`). Links to other sites are refused by the form, by the database (`details_problem()`), and ignored by `api/invite.js` (it falls back to the site image). Before running `006` on a live project, run the query at the top of that file to list invitations that hold another kind of link; they stay readable, but cannot be edited until their preview image is removed or uploaded again. This rule needs an `https` Supabase URL, so it does not apply to a local `http://localhost` Supabase.
- Deleting an invitation for good (the trash is emptied after 30 days) also deletes its picture, unless another invitation still uses the same file (*Duplicate* copies the link to the original's picture).

### Trash

Moving an invitation to the trash sets `deleted_at` to the **database's** clock (task L-8, migration `009`); the time the browser sends is ignored, and trashing something already in the trash keeps its first date. Whether an invitation is old enough to delete for good (30 days, set in `trash_retention()`) is also decided by the database: when the Dashboard opens it asks `expired_trash_ids()` and removes those invitations together with their pictures. A daily job, `purge_expired_trash()`, does the same for every owner but removes rows only; it needs the **pg_cron** extension (Supabase → Database → Extensions), and migration `009` prints a notice if it is not available. In the SQL Editor you can set `deleted_at` to any date (for example to test the purge); only calls through the API are stamped.
- **Orphan cleanup** (`api/cleanup-previews.js`, rules in `api/_orphans.js`). A picture is removed only when its name is `<user>/<invitation id>.jpg`, **no invitation row has that id** (invitations in the trash still count), **no invitation's `seoImage` points at it** (a *Duplicate* shares the original's file) and it was last written **more than 24 hours ago**. It deletes at most 200 files per call, refuses to delete anything when it could not read the full invitation list (or read none while files exist), and does nothing for names of any other shape.
  - Set three **server-side** variables on Vercel (none may start with `VITE_`): `CRON_SECRET` (a long random string), `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API; **never** put it in a `VITE_` variable or in the repo) and the existing `VITE_SUPABASE_URL`. With any missing, the route answers 503 and does nothing.
  - Try it by hand first, it is a **dry run** unless you add `?delete=1`: `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DOMAIN/api/cleanup-previews` lists what would be deleted; read the list, then add `?delete=1`.
  - No schedule is set in `vercel.json` on purpose. To run it daily, add `"crons": [{ "path": "/api/cleanup-previews?delete=1", "schedule": "23 3 * * *" }]` to `vercel.json` (Vercel Cron sends the `CRON_SECRET` header by itself; check your plan's cron limits).

### Telugu typing

The Telugu name and venue fields fill in as you type in English. `src/lib/transliterate.ts` asks the **Google Input Tools** endpoint (`inputtools.google.com`, the one behind Google's own Telugu typing) for each word and falls back to the offline rules in `src/lib/telugu.ts` when it cannot answer. That endpoint is **not a documented, supported API**: it has no key, no quota and no promise to keep working, which is why the offline fallback exists and the Telugu field is never left empty.

- **Privacy:** the English words typed in those fields are sent to Google, one request per word. Say so in your privacy policy. To send nothing, set `VITE_TRANSLITERATION=offline` (see `.env.example`) and rebuild; only the offline rules are then used.
- When the service answers but has no suggestion for a word, the offline result is used for that word and online lookups continue. Only a real failure (network error, timeout, HTTP error, unexpected answer) pauses online lookups for 60 seconds; those words are looked up again later.

## Deep links on Vercel

`vercel.json` sends every path that is not a file (`/i/abc123`, `/create`, `/invitations`) to `index.html`, so refreshing or opening a shared link works. Real files and `/assets/*` are never rewritten, so a missing file returns a proper 404 instead of the app. Hashed assets are cached for a year; the HTML is always revalidated so new deploys show up immediately.

## Scripts

- `npm run dev` start the dev server
- `npm run typecheck` TypeScript check (the whole project is TypeScript, including `vite.config.ts`)
- `npm run build` type-check, then production build
- `npm test` unit tests (Vitest, task M-14): `src/**/*.test.ts`, run once. A test that needs a DOM starts with `// @vitest-environment jsdom`.
- CI (`docs/ci.yml`; copy it to `.github/workflows/ci.yml` to turn it on) runs typecheck, lint, tests and build on every push and pull request to `preview` and `main`; `.github/dependabot.yml` opens weekly update pull requests.
- `npm run lint:install` once, then `npm run lint` ESLint (`@typescript-eslint`, `react-hooks/rules-of-hooks` as an error, `exhaustive-deps` as a warning). The lint tools live in `tools/lint` with their own `package.json` and TypeScript 5.9, because `typescript-eslint` cannot run on the TypeScript 7 used by the app (7 has no JavaScript compiler API). The app is still checked by `npm run typecheck`. Move the lint packages into the root `package.json` once `typescript-eslint` supports TypeScript 7. Warnings (unused variables, `any`, hook dependencies) are shown but do not fail the run; errors do.
